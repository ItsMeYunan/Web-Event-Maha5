"""
Reaction Vote Listener
Captures emoji reactions (1️⃣..🔟) on the poll embed message, validates Stage Gate dynamically, and submits to backend.
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

logger = logging.getLogger("discord_voting.reaction_listener")

EMOJI_TO_KEY = {
    "1️⃣": "1",
    "2️⃣": "2",
    "3️⃣": "3",
    "4️⃣": "4",
    "5️⃣": "5",
    "6️⃣": "6",
    "7️⃣": "7",
    "8️⃣": "8",
    "9️⃣": "9",
    "🔟": "10",
}

class ReactionVoteListener(commands.Cog):
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
    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
        # Ignore bot's own reactions
        if self.bot.user and payload.user_id == self.bot.user.id or not payload.guild_id:
            return

        emoji_str = str(payload.emoji)
        if emoji_str not in EMOJI_TO_KEY:
            return

        key_code = EMOJI_TO_KEY[emoji_str]
        channel_id = payload.channel_id
        session_id = self.vote_cog.active_sessions.get(channel_id)

        if not session_id:
            return

        session_data = self.vote_cog.session_meta.get(session_id)
        if not session_data:
            return

        # Check if the reaction is on the poll message
        if payload.message_id != session_data.get("poll_message_id"):
            return

        # Check if key_code is valid
        valid_keys = {c["keyCode"] for c in session_data.get("candidates", [])}
        if key_code not in valid_keys:
            return

        guild = self.bot.get_guild(payload.guild_id)
        if not guild:
            return

        member = payload.member or guild.get_member(payload.user_id)
        if not member or getattr(member, "bot", False):
            return

        # 1. Dynamic Stage Gate Check
        stage_channel_id = session_data.get("stage_channel_id")
        is_gated = session_data.get("is_gated", self.stage_gate.voice_gate_enabled)

        if is_gated and not self.stage_gate.is_eligible(member, session_stage_channel_id=stage_channel_id):
            logger.info(
                f"Reaction vote from {member.name} ({member.id}) REJECTED: Not in required Stage Channel ({stage_channel_id}). Removing reaction."
            )
            # Remove the non-eligible member's reaction
            try:
                channel = guild.get_channel(channel_id)
                if channel:
                    msg = await channel.fetch_message(payload.message_id)
                    await msg.remove_reaction(payload.emoji, member)
            except discord.Forbidden:
                logger.debug("Bot lacks Manage Messages permission to remove reaction.")
            except Exception as e:
                logger.debug(f"Could not remove reaction: {e}")
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
            logger.info(f"Reaction vote recorded: {getattr(member, 'display_name', member)} -> [{key_code}] in session {session_id}")
        except Exception as e:
            logger.warning(f"Failed to submit reaction vote to backend: {e}")
