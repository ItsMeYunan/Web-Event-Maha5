"""Embedded HTTP API for the /dashboard frontend: Discord OAuth2 authorization
code exchange, server-side authority checks, and session history.

Runs inside the bot process (aiohttp - already a transitive dependency of
discord.py, so this adds nothing new) instead of a separate service: the
project has exactly two tracks, Discord Bot and Web, and the bot's own Sprint
4 scope is "WebSocket server, hosting WebUI & OBS widget". Authority checks
reuse the bot's live guild/member cache via a plain REST fetch_member call,
which needs no privileged Members intent.

ponytail: auth sessions and history are process-memory only - both are lost
on restart and don't survive multiple bot instances. Move to Redis/a DB file
if the bot ever needs to run more than one process or history must outlive a
restart.
"""
import logging
import secrets
import time
from typing import Any, Dict, List, Optional

import aiohttp
import discord
from aiohttp import web
from discord.ext import commands

from config import AppConfig
from utils.permissions import is_voting_admin

logger = logging.getLogger("discord_voting.web")

DISCORD_API = "https://discord.com/api/v10"
SESSION_TTL_SECONDS = 24 * 60 * 60
HISTORY_LIMIT = 20
DISCORD_USER_FIELDS = ("id", "username", "discriminator", "global_name", "avatar")


class WebServer:
    """aiohttp app + runner, started/stopped alongside the bot in bot.py."""

    def __init__(self, bot: commands.Bot, config: AppConfig):
        self.bot = bot
        self.config = config
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._history: List[Dict[str, Any]] = []
        self._http = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10.0))
        self._runner: Optional[web.AppRunner] = None

        self.app = web.Application()
        self.app.add_routes([
            web.post("/api/auth/discord", self._auth_discord),
            web.get("/api/auth/session", self._auth_session),
            web.post("/api/auth/logout", self._auth_logout),
            web.get("/api/history", self._history_list),
            web.post("/api/history", self._history_add),
            web.delete("/api/history", self._history_clear),
        ])

    async def start(self) -> None:
        self._runner = web.AppRunner(self.app)
        await self._runner.setup()
        site = web.TCPSite(self._runner, self.config.server.host, self.config.server.port)
        await site.start()
        logger.info(f"🌐 API server listening on {self.config.server.host}:{self.config.server.port}")

    async def stop(self) -> None:
        await self._http.close()
        if self._runner:
            await self._runner.cleanup()

    # ---- Discord OAuth2 (authorization code grant, exchanged server-side) --

    async def _exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        discord_cfg = self.config.discord
        # a plain str-value dict is form-encoded (application/x-www-form-urlencoded)
        # by aiohttp automatically - no manual Content-Type needed.
        async with self._http.post(
            f"{DISCORD_API}/oauth2/token",
            data={
                "client_id": discord_cfg.client_id,
                "client_secret": discord_cfg.client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
        ) as response:
            response.raise_for_status()
            return await response.json()

    async def _fetch_discord_user(self, access_token: str) -> Dict[str, Any]:
        async with self._http.get(
            f"{DISCORD_API}/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        ) as response:
            response.raise_for_status()
            raw = await response.json()
            return {field: raw.get(field) for field in DISCORD_USER_FIELDS}

    async def _check_authorized(self, user_id: str) -> bool:
        """Whether this Discord user could run `!vote info` in any guild the
        bot shares with them - same is_voting_admin gate, checked server-side.
        fetch_member is a plain REST call, so it needs no Members intent."""
        await self.bot.wait_until_ready()
        discord_cfg = self.config.discord
        for guild in self.bot.guilds:
            try:
                member = await guild.fetch_member(int(user_id))
            except discord.NotFound:
                continue
            except discord.HTTPException as e:
                logger.warning(f"Could not check membership in {guild.id}: {e}")
                continue
            if is_voting_admin(member, discord_cfg.admin_role_ids, discord_cfg.min_role_id):
                return True
        return False

    async def _auth_discord(self, request: web.Request) -> web.Response:
        try:
            body = await request.json()
        except ValueError:
            return web.json_response({"error": "Body harus JSON"}, status=400)

        code, redirect_uri = body.get("code"), body.get("redirectUri")
        if not code or not redirect_uri:
            return web.json_response({"error": "code dan redirectUri wajib diisi"}, status=400)

        discord_cfg = self.config.discord
        if not discord_cfg.client_id or not discord_cfg.client_secret:
            return web.json_response(
                {"error": "DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET belum diatur di server"},
                status=500,
            )

        try:
            token_data = await self._exchange_code(code, redirect_uri)
            user = await self._fetch_discord_user(token_data["access_token"])
        except aiohttp.ClientResponseError as e:
            logger.warning(f"Discord OAuth2 exchange rejected: {e}")
            return web.json_response({"error": "Kode otorisasi Discord ditolak"}, status=401)

        is_authorized = await self._check_authorized(user["id"])
        session_token = secrets.token_urlsafe(32)
        self._sessions[session_token] = {
            "user": user,
            "isAuthorized": is_authorized,
            "expiresAt": time.monotonic() + SESSION_TTL_SECONDS,
        }
        return web.json_response({"token": session_token, "user": user, "isAuthorized": is_authorized})

    def _bearer_token(self, request: web.Request) -> Optional[str]:
        auth = request.headers.get("Authorization", "")
        return auth[len("Bearer "):] if auth.startswith("Bearer ") else None

    def _require_session(self, request: web.Request) -> Optional[Dict[str, Any]]:
        token = self._bearer_token(request)
        session = self._sessions.get(token) if token else None
        if not session or session["expiresAt"] < time.monotonic():
            return None
        return session

    async def _auth_session(self, request: web.Request) -> web.Response:
        session = self._require_session(request)
        if not session:
            return web.json_response({"error": "Sesi tidak valid atau kedaluwarsa"}, status=401)
        return web.json_response({"user": session["user"], "isAuthorized": session["isAuthorized"]})

    async def _auth_logout(self, request: web.Request) -> web.Response:
        token = self._bearer_token(request)
        if token:
            self._sessions.pop(token, None)
        return web.Response(status=204)

    # ---- history: readable/writable only by accounts that can !vote info --

    def _authorize_or_error(self, request: web.Request) -> Optional[web.Response]:
        """None means the caller may proceed; otherwise the response to send:
        401 with no/expired session, 403 logged in but not a voting admin."""
        session = self._require_session(request)
        if not session:
            return web.json_response({"error": "Sesi tidak valid atau kedaluwarsa"}, status=401)
        if not session["isAuthorized"]:
            return web.json_response({"error": "Akses ditolak"}, status=403)
        return None

    async def _history_list(self, request: web.Request) -> web.Response:
        error = self._authorize_or_error(request)
        if error:
            return error
        return web.json_response(self._history)

    async def _history_add(self, request: web.Request) -> web.Response:
        error = self._authorize_or_error(request)
        if error:
            return error
        try:
            entry = await request.json()
        except ValueError:
            return web.json_response({"error": "Body harus JSON"}, status=400)

        session_id = entry.get("sessionId")
        if not session_id:
            return web.json_response({"error": "sessionId wajib diisi"}, status=400)

        # Re-recording the same sessionId replaces the existing entry, newest first.
        self._history = [entry] + [h for h in self._history if h.get("sessionId") != session_id]
        self._history = self._history[:HISTORY_LIMIT]
        return web.Response(status=204)

    async def _history_clear(self, request: web.Request) -> web.Response:
        error = self._authorize_or_error(request)
        if error:
            return error
        self._history = []
        return web.Response(status=204)
