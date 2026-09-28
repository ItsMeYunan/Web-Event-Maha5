"""Turns chat messages like '1' or '2' in a voting channel into votes."""
import logging

import discord
from discord.ext import commands

from commands.vote_cmd import VoteCommands
from services.api import BunApiClient
from utils.permissions import is_in_stage

logger = logging.getLogger("discord_voting.msg_listener")


class MessageVoteListener(commands.Cog):
    def __init__(self, bot: commands.Bot, vote_cog: VoteCommands, api_client: BunApiClient):
        self.bot = bot
        self.vote_cog = vote_cog
        self.api = api_client

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return

        session_id = self.vote_cog.active_sessions.get(message.channel.id)
        if not session_id:
            return

        key_code = message.content.strip()
        if not key_code.isdigit():
            return

        meta = self.vote_cog.session_meta.get(session_id)
        if not meta or key_code not in meta["keys"]:
            return

        member = message.author
        if meta["is_gated"] and not is_in_stage(member, meta["stage_channel_id"]):
            # Silent rejection per spec - no reply spam in the voting channel.
            logger.info(f"Vote from {member.id} rejected: not in stage "
                        f"{meta['stage_channel_id']}")
            return

        avatar = getattr(member, "display_avatar", None)
        try:
            await self.api.process_vote(
                session_id=session_id,
                user_id=str(member.id),
                username=getattr(member, "display_name", str(member.id)),
                key_code=key_code,
                avatar_url=str(avatar.url) if avatar else None,
            )
            logger.info(f"Vote recorded: {member.id} -> [{key_code}] in {session_id}")
        except Exception as e:
            logger.warning(f"Failed to submit vote to backend: {e}")
