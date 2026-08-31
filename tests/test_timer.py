import pytest
import asyncio
from services.timer import SessionTimerManager

@pytest.mark.asyncio
async def test_timer_ticks_and_expires():
    manager = SessionTimerManager()
    ticks = []
    expired = []

    async def on_tick(s_id, remaining, formatted):
        ticks.append((s_id, remaining, formatted))

    async def on_expire(s_id):
        expired.append(s_id)

    task = manager.start_timer(
        session_id="test_sess_1",
        duration_seconds=2,
        on_tick=on_tick,
        on_expire=on_expire
    )

    assert manager.is_running("test_sess_1") is True

    await asyncio.sleep(2.2)

    assert "test_sess_1" in expired
    assert len(ticks) >= 2
    assert manager.is_running("test_sess_1") is False

@pytest.mark.asyncio
async def test_timer_cancellation():
    manager = SessionTimerManager()
    expired = []

    async def on_expire(s_id):
        expired.append(s_id)

    manager.start_timer(
        session_id="test_sess_2",
        duration_seconds=5,
        on_expire=on_expire
    )

    assert manager.is_running("test_sess_2") is True
    cancelled = manager.cancel_timer("test_sess_2")
    assert cancelled is True
    assert manager.is_running("test_sess_2") is False

    await asyncio.sleep(1.0)
    assert len(expired) == 0
