"""
Session Timer Manager
Runs background asyncio countdown tasks and triggers auto-stop upon expiry.
"""
import asyncio
from typing import Callable, Coroutine, Any, Dict, Optional
import logging

try:
    from utils.duration import format_duration
except ImportError:
    from ..utils.duration import format_duration

logger = logging.getLogger("discord_voting.timer")

class SessionTimerManager:
    def __init__(self):
        self._active_tasks: Dict[str, asyncio.Task] = {}

    def start_timer(
        self,
        session_id: str,
        duration_seconds: int,
        on_tick: Optional[Callable[[str, int, str], Coroutine[Any, Any, None]]] = None,
        on_expire: Optional[Callable[[str], Coroutine[Any, Any, None]]] = None
    ) -> asyncio.Task:
        """Launch background timer task for a session."""
        self.cancel_timer(session_id)

        task = asyncio.create_task(
            self._timer_worker(session_id, duration_seconds, on_tick, on_expire)
        )
        self._active_tasks[session_id] = task
        return task

    async def _timer_worker(
        self,
        session_id: str,
        duration: int,
        on_tick: Optional[Callable[[str, int, str], Coroutine[Any, Any, None]]],
        on_expire: Optional[Callable[[str], Coroutine[Any, Any, None]]]
    ):
        remaining = duration
        try:
            while remaining > 0:
                await asyncio.sleep(1)
                remaining -= 1
                formatted = format_duration(remaining)

                if on_tick:
                    try:
                        await on_tick(session_id, remaining, formatted)
                    except Exception as e:
                        logger.debug(f"Timer tick callback failed: {e}")

            # Session expired naturally
            logger.info(f"Session {session_id} expired. Triggering on_expire.")
            if on_expire:
                await on_expire(session_id)

        except asyncio.CancelledError:
            logger.info(f"Timer for session {session_id} was cancelled.")
        finally:
            self._active_tasks.pop(session_id, None)

    def cancel_timer(self, session_id: str) -> bool:
        """Cancel an active timer task."""
        task = self._active_tasks.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            return True
        return False

    def is_running(self, session_id: str) -> bool:
        return session_id in self._active_tasks and not self._active_tasks[session_id].done()
