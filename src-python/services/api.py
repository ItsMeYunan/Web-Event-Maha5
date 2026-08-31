"""
Backend API Client
Asynchronous HTTP Client for communicating with the Bun/ElysiaJS Backend.
"""
from typing import Dict, Any, Optional, List
import httpx
import logging

logger = logging.getLogger("discord_voting.api")

class BunApiClient:
    def __init__(self, base_url: str, admin_key: str):
        self.base_url = base_url.rstrip("/")
        self.admin_key = admin_key
        self.headers = {
            "Content-Type": "application/json",
            "X-Admin-Key": self.admin_key,
        }

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
        stage_name: str = "#live-stage"
    ) -> Dict[str, Any]:
        """POST /api/sessions - Create a new voting session."""
        url = f"{self.base_url}/api/sessions"
        payload = {
            "title": title,
            "candidates": candidates,
            "durationSeconds": duration_seconds,
            "channelId": str(channel_id),
            "guildId": str(guild_id),
            "voteMode": vote_mode,
            "cooldownSeconds": cooldown_seconds,
            "isStageGated": is_stage_gated,
            "stageName": stage_name,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                logger.error(f"Failed to create session: {exc.response.status_code} - {exc.response.text}")
                raise
            except Exception as exc:
                logger.error(f"Network error creating session: {exc}")
                raise

    async def process_vote(
        self,
        session_id: str,
        user_id: str,
        username: str,
        key_code: str,
        avatar_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """POST /api/sessions/:id/vote - Submit a vote."""
        url = f"{self.base_url}/api/sessions/{session_id}/vote"
        payload = {
            "userId": str(user_id),
            "username": username,
            "keyCode": str(key_code),
            "avatarUrl": avatar_url,
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                logger.warning(f"Vote submission rejected: {exc.response.status_code} - {exc.response.text}")
                raise
            except Exception as exc:
                logger.error(f"Network error processing vote: {exc}")
                raise

    async def stop_session(self, session_id: str) -> Dict[str, Any]:
        """POST /api/sessions/:id/stop - Stop and finalize session."""
        url = f"{self.base_url}/api/sessions/{session_id}/stop"
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.post(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except Exception as exc:
                logger.error(f"Failed to stop session {session_id}: {exc}")
                raise

    async def cancel_session(self, session_id: str) -> Dict[str, Any]:
        """DELETE /api/sessions/:id - Cancel session."""
        url = f"{self.base_url}/api/sessions/{session_id}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.delete(url, headers=self.headers)
                response.raise_for_status()
                return response.json()
            except Exception as exc:
                logger.error(f"Failed to cancel session {session_id}: {exc}")
                raise

    async def sync_timer(self, session_id: str, remaining_seconds: int, formatted_time: str) -> None:
        """POST /api/sessions/:id/timer - Broadcast timer update."""
        url = f"{self.base_url}/api/sessions/{session_id}/timer"
        payload = {
            "remainingSeconds": remaining_seconds,
            "formattedTime": formatted_time
        }
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                await client.post(url, json=payload, headers=self.headers)
            except Exception as exc:
                logger.debug(f"Timer sync ping error (non-fatal): {exc}")
