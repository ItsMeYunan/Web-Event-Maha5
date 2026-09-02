import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock

from commands.vote_cmd import VoteCommands
from config import AppConfig
from listeners.message_listener import MessageVoteListener
from services.timer import SessionTimerManager


@pytest.fixture
def setup():
    bot = MagicMock()
    config = AppConfig()
    config.discord.voice_gate_enabled = True
    config.discord.target_stage_channel_id = 12345

    api = MagicMock()
    api.create_session = AsyncMock(return_value={"sessionId": "sess_test_100"})
    api.process_vote = AsyncMock(return_value={"success": True})
    api.stop_session = AsyncMock(return_value={"status": "CLOSED"})
    api.cancel_session = AsyncMock(return_value={"status": "CANCELLED"})

    vote_cog = VoteCommands(bot, config, api, SessionTimerManager())
    return {
        "api": api,
        "vote_cog": vote_cog,
        "msg_listener": MessageVoteListener(bot, vote_cog, api),
    }


def register(vote_cog, *, gated=True, keys=("1", "2")):
    vote_cog.active_sessions[5555] = "sess_test_100"
    vote_cog.session_meta["sess_test_100"] = {
        "channel_id": 5555,
        "keys": set(keys),
        "stage_channel_id": 12345,
        "is_gated": gated,
    }


def voter(user_id, voice_channel_id=None):
    msg = MagicMock()
    msg.author.bot = False
    msg.author.id = user_id
    msg.author.display_name = f"User{user_id}"
    msg.author.display_avatar.url = "http://avatar.jpg"
    msg.author.voice = (
        MagicMock(channel=MagicMock(id=voice_channel_id)) if voice_channel_id else None
    )
    msg.channel.id = 5555
    msg.guild.id = 8888
    return msg


def admin_ctx(stage_id=12345):
    ctx = MagicMock()
    ctx.author.id = 1
    ctx.author.voice = None
    ctx.guild.owner_id = 1
    ctx.guild.id = 8888
    ctx.guild.get_channel = lambda cid: (
        MagicMock(id=stage_id, name="live-stage") if stage_id and cid == stage_id else None
    )
    ctx.reply = AsyncMock()
    return ctx


@pytest.mark.asyncio
async def test_initiate_registers_session(setup):
    vote_cog, api = setup["vote_cog"], setup["api"]
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    await vote_cog.initiate.callback(vote_cog, admin_ctx(), channel, "5m", "Alpha", "Bravo")

    assert vote_cog.active_sessions[5555] == "sess_test_100"
    assert vote_cog.session_meta["sess_test_100"]["keys"] == {"1", "2"}
    assert api.create_session.called
    assert channel.send.called


@pytest.mark.asyncio
async def test_vote_from_stage_is_submitted(setup):
    register(setup["vote_cog"])
    msg = voter(42, voice_channel_id=12345)
    msg.content = "1"

    await setup["msg_listener"].on_message(msg)

    setup["api"].process_vote.assert_called_once_with(
        session_id="sess_test_100", user_id="42", username="User42",
        key_code="1", avatar_url="http://avatar.jpg",
    )


@pytest.mark.asyncio
async def test_vote_from_outside_stage_is_rejected(setup):
    register(setup["vote_cog"])
    msg = voter(99)
    msg.content = "1"

    await setup["msg_listener"].on_message(msg)
    setup["api"].process_vote.assert_not_called()


@pytest.mark.asyncio
async def test_unknown_candidate_number_is_ignored(setup):
    register(setup["vote_cog"], keys=("1", "2"))
    msg = voter(42, voice_channel_id=12345)
    msg.content = "9"

    await setup["msg_listener"].on_message(msg)
    setup["api"].process_vote.assert_not_called()


@pytest.mark.asyncio
async def test_ungated_session_accepts_a_voter_outside_voice(setup):
    register(setup["vote_cog"], gated=False)
    msg = voter(77)
    msg.content = "2"

    await setup["msg_listener"].on_message(msg)
    assert setup["api"].process_vote.called


@pytest.mark.asyncio
async def test_stop_finalises_and_clears_the_session(setup):
    vote_cog, api = setup["vote_cog"], setup["api"]
    register(vote_cog)
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    await vote_cog.stop.callback(vote_cog, admin_ctx(), channel)

    api.stop_session.assert_awaited_once_with("sess_test_100")
    assert 5555 not in vote_cog.active_sessions
    assert "sess_test_100" not in vote_cog.session_meta


@pytest.mark.asyncio
async def test_cancel_uses_the_cancel_endpoint(setup):
    vote_cog, api = setup["vote_cog"], setup["api"]
    register(vote_cog)
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    await vote_cog.cancel.callback(vote_cog, admin_ctx(), channel)

    api.cancel_session.assert_awaited_once_with("sess_test_100")
    api.stop_session.assert_not_called()
    assert 5555 not in vote_cog.active_sessions


@pytest.mark.asyncio
async def test_non_admin_cannot_stop(setup):
    vote_cog, api = setup["vote_cog"], setup["api"]
    register(vote_cog)

    ctx = MagicMock()
    ctx.author.id = 2
    ctx.guild.owner_id = 1                     # not the owner
    ctx.author.guild_permissions.administrator = False
    ctx.author.guild_permissions.manage_channels = False
    ctx.author.guild_permissions.manage_guild = False
    ctx.author.roles = []
    ctx.reply = AsyncMock()
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    await vote_cog.stop.callback(vote_cog, ctx, channel)

    api.stop_session.assert_not_called()
    assert 5555 in vote_cog.active_sessions    # session survives a rejected stop


@pytest.mark.asyncio
async def test_initiate_without_channel_uses_the_current_one(setup):
    """!vote initiate 5m Alpha Bravo -> runs in the channel the command came from."""
    vote_cog = setup["vote_cog"]
    ctx = admin_ctx()
    ctx.channel = MagicMock(id=4242, mention="<#4242>")
    ctx.channel.send = AsyncMock()

    await vote_cog.initiate.callback(vote_cog, ctx, None, "5m", "Alpha", "Bravo")

    assert vote_cog.active_sessions[4242] == "sess_test_100"
    assert ctx.channel.send.called          # embed went to the invoking channel


@pytest.mark.asyncio
async def test_votes_only_count_in_the_session_channel(setup):
    """A message in another channel finds no session, so it can never vote."""
    register(setup["vote_cog"])            # session lives on channel 5555
    msg = voter(42, voice_channel_id=12345)
    msg.content = "1"
    msg.channel.id = 6666                  # different channel

    await setup["msg_listener"].on_message(msg)
    setup["api"].process_vote.assert_not_called()


@pytest.mark.asyncio
async def test_voting_from_an_unrelated_voice_channel_is_rejected(setup):
    """Joining any other voice channel must not satisfy the stage gate."""
    register(setup["vote_cog"])
    msg = voter(42, voice_channel_id=99999)   # some other/private channel
    msg.content = "1"

    await setup["msg_listener"].on_message(msg)
    setup["api"].process_vote.assert_not_called()


@pytest.mark.asyncio
async def test_gated_initiate_fails_closed_when_no_stage_is_found(setup):
    """Gating on with no resolvable stage must refuse, not open the vote up."""
    vote_cog, api = setup["vote_cog"], setup["api"]
    vote_cog.config.discord.target_stage_channel_id = None   # nothing configured

    ctx = admin_ctx(stage_id=None)
    ctx.author.voice = None                                   # admin not in voice
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    await vote_cog.initiate.callback(vote_cog, ctx, channel, "5m", "Alpha", "Bravo")

    api.create_session.assert_not_called()
    assert 5555 not in vote_cog.active_sessions


@pytest.mark.asyncio
async def test_stage_falls_back_to_the_admins_voice_channel(setup):
    """No configured stage -> bind to wherever the initiating admin is."""
    vote_cog = setup["vote_cog"]
    vote_cog.config.discord.target_stage_channel_id = None

    ctx = admin_ctx(stage_id=None)
    ctx.author.voice = MagicMock(channel=MagicMock(id=777, name="stage-live"))
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    await vote_cog.initiate.callback(vote_cog, ctx, channel, "5m", "Alpha", "Bravo")

    assert vote_cog.session_meta["sess_test_100"]["stage_channel_id"] == 777


@pytest.mark.asyncio
async def test_expiry_finalises_even_when_the_backend_awaits(setup):
    """The timer calls _close from inside its own task. Uses a real await point
    because AsyncMock never suspends and so would hide a self-cancel."""
    vote_cog = setup["vote_cog"]
    register(vote_cog)
    completed = {"stop": False}

    async def slow_stop(session_id):
        await asyncio.sleep(0.05)          # real suspension, like real HTTP
        completed["stop"] = True
        return {}

    vote_cog.api.stop_session = slow_stop
    channel = MagicMock(id=5555, mention="<#5555>")
    channel.send = AsyncMock()

    async def on_expire(session_id):
        await vote_cog._handle_auto_stop(session_id, channel)

    vote_cog.timer_mgr.start_timer("sess_test_100", 1, on_expire=on_expire)
    await asyncio.sleep(1.4)

    assert completed["stop"] is True, "backend never told the session ended"
    assert channel.send.called, "final results were never posted"
    assert 5555 not in vote_cog.active_sessions
