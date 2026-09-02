"""Backend API client.

One long-lived httpx.AsyncClient, reused across calls so the connection pool
actually pools (httpx docs advise against a client per request). Errors are not
caught here: raise_for_status propagates to the caller, which already reports
failures to Discord.
"""
from typing import Any, Dict, List, Optional

import httpx


class BunApiClient:
    def __init__(self, base_url: str, admin_key: str, timeout: float = 10.0):
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"Content-Type": "application/json", "X-Admin-Key": admin_key},
            timeout=timeout,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kwargs: Any) -> Dict[str, Any]:
        response = await self._client.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json()

    async def create_session(
        self,
        title: str,
        candidates: List[Dict[str, Any]],
        duration_seconds: int,
        channel_id: str,
        guild_id: str,
        vote_mode: str = "ONE_TIME",
        cooldown_seconds: int = 15,
        is_stage_gated: bool = True,
        stage_name: str = "#live-stage",
    ) -> Dict[str, Any]:
        return await self._request("POST", "/api/sessions", json={
            "title": title,
            "candidates": candidates,
            "durationSeconds": duration_seconds,
            "channelId": str(channel_id),
            "guildId": str(guild_id),
            "voteMode": vote_mode,
            "cooldownSeconds": cooldown_seconds,
            "isStageGated": is_stage_gated,
            "stageName": stage_name,
        })

    async def process_vote(
        self,
        session_id: str,
        user_id: str,
        username: str,
        key_code: str,
        avatar_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self._request("POST", f"/api/sessions/{session_id}/vote", json={
            "userId": str(user_id),
            "username": username,
            "keyCode": str(key_code),
            "avatarUrl": avatar_url,
        })

    async def stop_session(self, session_id: str) -> Dict[str, Any]:
        return await self._request("POST", f"/api/sessions/{session_id}/stop")

    async def cancel_session(self, session_id: str) -> Dict[str, Any]:
        return await self._request("DELETE", f"/api/sessions/{session_id}")
