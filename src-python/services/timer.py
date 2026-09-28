"""Session countdown tasks: sleep until expiry, then fire on_expire."""
import asyncio
import logging
from typing import Any, Callable, Coroutine, Dict, Optional

logger = logging.getLogger("discord_voting.timer")


class SessionTimerManager:
    def __init__(self) -> None:
        self._active_tasks: Dict[str, asyncio.Task] = {}

    def start_timer(
        self,
        session_id: str,
        duration_seconds: int,
        on_expire: Optional[Callable[[str], Coroutine[Any, Any, None]]] = None,
    ) -> asyncio.Task:
        """Launch the expiry task for a session, replacing any existing one."""
        self.cancel_timer(session_id)
        task = asyncio.create_task(self._wait(session_id, duration_seconds, on_expire))
        self._active_tasks[session_id] = task
        return task

    async def _wait(
        self,
        session_id: str,
        duration: int,
        on_expire: Optional[Callable[[str], Coroutine[Any, Any, None]]],
    ) -> None:
        try:
            # The client renders its own countdown, so nothing needs ticking here.
            await asyncio.sleep(duration)
            logger.info(f"Session {session_id} expired.")
            if on_expire:
                await on_expire(session_id)
        except asyncio.CancelledError:
            logger.info(f"Timer for session {session_id} was cancelled.")
        finally:
            self._active_tasks.pop(session_id, None)

    def cancel_timer(self, session_id: str) -> bool:
        task = self._active_tasks.pop(session_id, None)
        if task and not task.done():
            task.cancel()
            return True
        return False

    def is_running(self, session_id: str) -> bool:
        task = self._active_tasks.get(session_id)
        return task is not None and not task.done()
