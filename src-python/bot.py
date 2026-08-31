"""
Discord Live Voting Bot Entrypoint
Initializes discord.py client, loads configuration, sets up intents, and registers cogs.
"""
import os
import sys
import asyncio
import logging
import discord
from discord.ext import commands

from .config import load_config
from .services.api import BunApiClient
from .services.stage_gate import StageGateValidator
from .services.timer import SessionTimerManager
from .commands.vote_cmd import VoteCommands
from .listeners.message_listener import MessageVoteListener
from .listeners.reaction_listener import ReactionVoteListener

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("discord_voting")

def create_bot():
    config = load_config()

    # Setup Intents per SDD v1.2.0
    intents = discord.Intents.default()
    intents.guilds = True
    intents.guild_messages = True
    intents.message_content = True
    intents.guild_reactions = True
    intents.voice_states = True

    bot = commands.Bot(
        command_prefix=commands.when_mentioned_or(config.discord.command_prefix + " "),
        intents=intents,
        help_command=None
    )

    # Initialize Graph Nodes / Services
    api_client = BunApiClient(
        base_url=config.server.base_url,
        admin_key=config.server.admin_key
    )
    stage_gate = StageGateValidator(
        target_stage_channel_id=config.discord.target_stage_channel_id,
        voice_gate_enabled=config.discord.voice_gate_enabled
    )
    timer_mgr = SessionTimerManager()

    # Register Cogs
    vote_cog = VoteCommands(bot, config, api_client, timer_mgr)
    msg_listener = MessageVoteListener(bot, vote_cog, stage_gate, api_client)
    react_listener = ReactionVoteListener(bot, vote_cog, stage_gate, api_client)

    @bot.event
    async def on_ready():
        logger.info(f"Bot connected successfully as {bot.user} (ID: {bot.user.id})")
        logger.info(f"Loaded config: Base URL={config.server.base_url}, Stage Gating={config.discord.voice_gate_enabled}")

    async def setup():
        await bot.add_cog(vote_cog)
        await bot.add_cog(msg_listener)
        await bot.add_cog(react_listener)

    return bot, setup

async def main():
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        logger.warning(
            "DISCORD_BOT_TOKEN environment variable not set! Set token in .env or environment before running in production."
        )

    bot, setup = create_bot()
    async with bot:
        await setup()
        if token:
            await bot.start(token)

if __name__ == "__main__":
    asyncio.run(main())
