import asyncio

import pytest

from services.timer import SessionTimerManager


@pytest.mark.asyncio
async def test_timer_fires_on_expire():
    manager = SessionTimerManager()
    expired = []

    async def on_expire(session_id):
        expired.append(session_id)

    manager.start_timer("s1", duration_seconds=1, on_expire=on_expire)
    assert manager.is_running("s1") is True

    await asyncio.sleep(1.2)
    assert expired == ["s1"]
    assert manager.is_running("s1") is False


@pytest.mark.asyncio
async def test_cancelled_timer_never_fires():
    manager = SessionTimerManager()
    expired = []

    async def on_expire(session_id):
        expired.append(session_id)

    manager.start_timer("s2", duration_seconds=5, on_expire=on_expire)
    assert manager.cancel_timer("s2") is True
    assert manager.is_running("s2") is False

    await asyncio.sleep(0.2)
    assert expired == []


@pytest.mark.asyncio
async def test_restarting_replaces_the_previous_timer():
    manager = SessionTimerManager()
    fired = []

    async def on_expire(session_id):
        fired.append(session_id)

    manager.start_timer("s3", duration_seconds=5, on_expire=on_expire)
    manager.start_timer("s3", duration_seconds=1, on_expire=on_expire)

    await asyncio.sleep(1.2)
    assert fired == ["s3"]      # the 5s timer was cancelled, not left running
