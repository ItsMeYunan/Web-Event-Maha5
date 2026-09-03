import time
from unittest.mock import AsyncMock, MagicMock, patch

import discord
import pytest
from aiohttp.test_utils import TestClient, TestServer

from config import AppConfig
from services.webserver import WebServer


def make_member(*, is_admin: bool):
    member = MagicMock()
    member.guild = MagicMock(owner_id=1)
    member.id = 999
    member.guild_permissions = MagicMock(administrator=is_admin, manage_channels=False, manage_guild=False)
    member.roles = []
    return member


def make_bot(*, guild_member=None, member_error=None):
    bot = MagicMock()
    bot.wait_until_ready = AsyncMock()
    guild = MagicMock()
    if member_error is not None:
        guild.fetch_member = AsyncMock(side_effect=member_error)
    else:
        guild.fetch_member = AsyncMock(return_value=guild_member)
    bot.guilds = [guild]
    return bot


@pytest.fixture
def config():
    cfg = AppConfig()
    cfg.discord.client_id = "app123"
    cfg.discord.client_secret = "secret123"
    return cfg


DISCORD_USER = {
    "id": "999",
    "username": "nelly",
    "discriminator": "0",
    "global_name": "Nelly",
    "avatar": None,
}


async def make_client(bot, cfg):
    server = WebServer(bot, cfg)
    client = TestClient(TestServer(server.app))
    await client.start_server()
    return server, client


@pytest.mark.asyncio
async def test_auth_discord_exchanges_code_and_grants_authorized_admin(config):
    bot = make_bot(guild_member=make_member(is_admin=True))
    server, client = await make_client(bot, config)
    try:
        with patch.object(server, "_exchange_code", AsyncMock(return_value={"access_token": "atk"})), \
             patch.object(server, "_fetch_discord_user", AsyncMock(return_value=DISCORD_USER)):
            resp = await client.post(
                "/api/auth/discord", json={"code": "abc", "redirectUri": "http://x/dashboard"}
            )
        assert resp.status == 200
        body = await resp.json()
        assert body["isAuthorized"] is True
        assert body["user"]["id"] == "999"
        assert body["token"]
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_auth_discord_denies_non_admin(config):
    bot = make_bot(guild_member=make_member(is_admin=False))
    server, client = await make_client(bot, config)
    try:
        with patch.object(server, "_exchange_code", AsyncMock(return_value={"access_token": "atk"})), \
             patch.object(server, "_fetch_discord_user", AsyncMock(return_value=DISCORD_USER)):
            resp = await client.post(
                "/api/auth/discord", json={"code": "abc", "redirectUri": "http://x/dashboard"}
            )
        body = await resp.json()
        assert body["isAuthorized"] is False
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_auth_discord_treats_member_not_found_as_not_authorized(config):
    bot = make_bot(member_error=discord.NotFound(MagicMock(status=404), "not found"))
    server, client = await make_client(bot, config)
    try:
        with patch.object(server, "_exchange_code", AsyncMock(return_value={"access_token": "atk"})), \
             patch.object(server, "_fetch_discord_user", AsyncMock(return_value=DISCORD_USER)):
            resp = await client.post(
                "/api/auth/discord", json={"code": "abc", "redirectUri": "http://x/dashboard"}
            )
        body = await resp.json()
        assert body["isAuthorized"] is False
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_auth_discord_requires_client_credentials():
    cfg = AppConfig()   # client_id/client_secret left empty
    bot = make_bot(guild_member=make_member(is_admin=True))
    server, client = await make_client(bot, cfg)
    try:
        resp = await client.post(
            "/api/auth/discord", json={"code": "abc", "redirectUri": "http://x/dashboard"}
        )
        assert resp.status == 500
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_history_requires_authorization(config):
    bot = make_bot(guild_member=make_member(is_admin=False))
    server, client = await make_client(bot, config)
    try:
        # No token at all.
        resp = await client.get("/api/history")
        assert resp.status == 401

        # Authenticated but not an admin.
        server._sessions["tok"] = {"user": DISCORD_USER, "isAuthorized": False,
                                    "expiresAt": time.monotonic() + 3600}
        resp = await client.get("/api/history", headers={"Authorization": "Bearer tok"})
        assert resp.status == 403
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_history_add_dedupes_by_session_id_and_caps_at_20(config):
    bot = make_bot(guild_member=make_member(is_admin=True))
    server, client = await make_client(bot, config)
    server._sessions["tok"] = {"user": DISCORD_USER, "isAuthorized": True,
                                "expiresAt": time.monotonic() + 3600}
    headers = {"Authorization": "Bearer tok"}
    try:
        for i in range(25):
            resp = await client.post("/api/history", json={"sessionId": f"s{i}", "totalVotes": i},
                                      headers=headers)
            assert resp.status == 204

        resp = await client.get("/api/history", headers=headers)
        history = await resp.json()
        assert len(history) == 20
        assert history[0]["sessionId"] == "s24"        # newest first

        # Re-posting an existing sessionId replaces it in place, not duplicates it.
        resp = await client.post("/api/history", json={"sessionId": "s24", "totalVotes": 999},
                                  headers=headers)
        assert resp.status == 204
        resp = await client.get("/api/history", headers=headers)
        history = await resp.json()
        assert len(history) == 20
        assert history[0]["totalVotes"] == 999

        resp = await client.delete("/api/history", headers=headers)
        assert resp.status == 204
        resp = await client.get("/api/history", headers=headers)
        assert await resp.json() == []
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_session_lookup_round_trips_and_logout_invalidates(config):
    bot = make_bot(guild_member=make_member(is_admin=True))
    server, client = await make_client(bot, config)
    server._sessions["tok"] = {"user": DISCORD_USER, "isAuthorized": True,
                                "expiresAt": time.monotonic() + 3600}
    try:
        resp = await client.get("/api/auth/session", headers={"Authorization": "Bearer tok"})
        assert resp.status == 200
        body = await resp.json()
        assert body["user"]["id"] == "999"

        resp = await client.post("/api/auth/logout", headers={"Authorization": "Bearer tok"})
        assert resp.status == 204

        resp = await client.get("/api/auth/session", headers={"Authorization": "Bearer tok"})
        assert resp.status == 401
    finally:
        await client.close()
