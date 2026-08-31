import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from commands.vote_cmd import VoteCommands
from listeners.message_listener import MessageVoteListener
from listeners.reaction_listener import ReactionVoteListener
from config import AppConfig
from services.stage_gate import StageGateValidator
from services.timer import SessionTimerManager

@pytest.fixture
def mock_setup():
    bot = MagicMock()
    bot.user.id = 99999
    config = AppConfig()
    config.discord.target_stage_channel_id = 12345
    config.discord.voice_gate_enabled = True
    
    api_client = MagicMock()
    api_client.create_session = AsyncMock(return_value={"sessionId": "sess_test_100"})
    api_client.process_vote = AsyncMock(return_value={"success": True})
    api_client.stop_session = AsyncMock(return_value={"status": "CLOSED"})
    api_client.cancel_session = AsyncMock(return_value={"status": "CANCELLED"})

    timer_mgr = SessionTimerManager()
    stage_gate = StageGateValidator(target_stage_channel_id=12345, voice_gate_enabled=True)

    vote_cog = VoteCommands(bot, config, api_client, timer_mgr)
    msg_listener = MessageVoteListener(bot, vote_cog, stage_gate, api_client)
    react_listener = ReactionVoteListener(bot, vote_cog, stage_gate, api_client)

    return {
        "bot": bot,
        "config": config,
        "api": api_client,
        "timer_mgr": timer_mgr,
        "stage_gate": stage_gate,
        "vote_cog": vote_cog,
        "msg_listener": msg_listener,
        "react_listener": react_listener
    }

@pytest.mark.asyncio
async def test_vote_initiate_flow(mock_setup):
    vote_cog = mock_setup["vote_cog"]
    api = mock_setup["api"]

    ctx = MagicMock()
    ctx.author.id = 1
    ctx.guild.owner_id = 1 # Admin
    ctx.guild.id = 8888
    ctx.reply = AsyncMock()

    channel = MagicMock()
    channel.id = 5555
    channel.mention = "<#5555>"
    channel.send = AsyncMock(return_value=MagicMock(id=7777))

    await vote_cog.initiate.callback(vote_cog, ctx, channel, "5m", "Alpha", "Bravo", "Charlie")

    # Verify session is registered in active_sessions
    assert 5555 in vote_cog.active_sessions
    assert vote_cog.active_sessions[5555] == "sess_test_100"
    assert api.create_session.called is True
    assert channel.send.called is True

@pytest.mark.asyncio
async def test_chat_vote_ingestion_stage_allowed(mock_setup):
    msg_listener = mock_setup["msg_listener"]
    vote_cog = mock_setup["vote_cog"]
    api = mock_setup["api"]

    # Register active session
    vote_cog.active_sessions[5555] = "sess_test_100"
    vote_cog.session_meta["sess_test_100"] = {
        "channel_id": 5555,
        "candidates": [{"keyCode": "1", "name": "Alpha"}, {"keyCode": "2", "name": "Bravo"}]
    }

    # Message from voter inside stage channel (12345)
    msg = MagicMock()
    msg.author.bot = False
    msg.author.id = 42
    msg.author.display_name = "StageVoter"
    msg.author.display_avatar.url = "http://avatar.jpg"
    msg.author.voice.channel.id = 12345
    msg.channel.id = 5555
    msg.content = "1"
    msg.guild.id = 8888

    await msg_listener.on_message(msg)

    # Verify vote submission
    api.process_vote.assert_called_once_with(
        session_id="sess_test_100",
        user_id="42",
        username="StageVoter",
        key_code="1",
        avatar_url="http://avatar.jpg"
    )

@pytest.mark.asyncio
async def test_chat_vote_ingestion_non_stage_rejected(mock_setup):
    msg_listener = mock_setup["msg_listener"]
    vote_cog = mock_setup["vote_cog"]
    api = mock_setup["api"]

    vote_cog.active_sessions[5555] = "sess_test_100"
    vote_cog.session_meta["sess_test_100"] = {
        "channel_id": 5555,
        "candidates": [{"keyCode": "1", "name": "Alpha"}]
    }

    # Message from voter NOT in stage
    msg = MagicMock()
    msg.author.bot = False
    msg.author.id = 99
    msg.author.voice = None # Not in voice
    msg.channel.id = 5555
    msg.content = "1"
    msg.guild.id = 8888

    await msg_listener.on_message(msg)

    # API must NOT be called
    api.process_vote.assert_not_called()
