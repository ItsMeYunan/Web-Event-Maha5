"""
Message Vote Listener
Captures chat messages like '1', '2', etc. in voting channels, validates Stage Gate, and submits to backend.
"""
import discord
from discord.ext import commands
import logging

try:
    from commands.vote_cmd import VoteCommands
    from services.stage_gate import StageGateValidator
    from services.api import BunApiClient
except ImportError:
    from ..commands.vote_cmd import VoteCommands
    from ..services.stage_gate import StageGateValidator
    from ..services.api import BunApiClient

logger = logging.getLogger("discord_voting.msg_listener")

class MessageVoteListener(commands.Cog):
    def __init__(
        self,
        bot: commands.Bot,
        vote_cog: VoteCommands,
        stage_gate: StageGateValidator,
        api_client: BunApiClient
    ):
        self.bot = bot
        self.vote_cog = vote_cog
        self.stage_gate = stage_gate
        self.api = api_client

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        # Ignore bot messages
        if message.author.bot or not message.guild:
            return

        channel_id = message.channel.id
        session_id = self.vote_cog.active_sessions.get(channel_id)

        # Only process if this channel has an active voting session
        if not session_id:
            return

        content = message.content.strip()

        # Check if content is a candidate number (e.g. '1', '2', '3')
        if not content.isdigit():
            return

        key_code = content
        session_data = self.vote_cog.session_meta.get(session_id)
        if not session_data:
            return

        # Check if key_code matches valid candidates
        valid_keys = {c["keyCode"] for c in session_data.get("candidates", [])}
        if key_code not in valid_keys:
            return

        # 1. Dynamic Stage Gate Check for this specific session
        member = message.author
        stage_channel_id = session_data.get("stage_channel_id")
        is_gated = session_data.get("is_gated", self.stage_gate.voice_gate_enabled)

        if is_gated and not self.stage_gate.is_eligible(member, session_stage_channel_id=stage_channel_id):
            logger.info(
                f"Vote from {member.name} ({member.id}) REJECTED: Not in required Stage Channel ({stage_channel_id})."
            )
            # Silent rejection per PRD / SRS spec
            return

        # 2. Submit Vote to Backend
        avatar_url = str(member.display_avatar.url) if getattr(member, "display_avatar", None) else None
        try:
            await self.api.process_vote(
                session_id=session_id,
                user_id=str(member.id),
                username=getattr(member, "display_name", str(member.id)),
                key_code=key_code,
                avatar_url=avatar_url
            )
            logger.info(f"Vote recorded: {getattr(member, 'display_name', member)} -> [{key_code}] in session {session_id}")
        except Exception as e:
            logger.warning(f"Failed to submit vote to backend: {e}")
