"""
Discord Live Real-Time Voting Bot
Dynamic Multi-Server Support & Gateway Orchestrator
"""
import os
import sys
import asyncio
import logging
import discord
from discord.ext import commands

try:
    from config import load_config
    from services.api import BunApiClient
    from services.stage_gate import StageGateValidator
    from services.timer import SessionTimerManager
    from commands.vote_cmd import VoteCommands
    from listeners.message_listener import MessageVoteListener
    from listeners.reaction_listener import ReactionVoteListener
except ImportError:
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

def create_bot(custom_config=None):
    config = custom_config or load_config()

    # Setup Gateway Intents
    intents = discord.Intents.default()
    intents.guilds = True
    intents.guild_messages = True
    intents.message_content = True
    intents.guild_reactions = True
    intents.voice_states = True

    bot = commands.Bot(
        command_prefix=commands.when_mentioned_or(config.discord.command_prefix + " ", "!vote "),
        intents=intents,
        help_command=None
    )

    # Initialize Graph Nodes / Dynamic Services
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
        logger.info("==========================================================")
        logger.info(f"✨ BOT ONLINE: {bot.user} (ID: {bot.user.id})")
        logger.info(f"🌐 Backend Target: {config.server.base_url}")
        logger.info(f"🎙️ Stage Gating Mode: {'AKTIF' if config.discord.voice_gate_enabled else 'NON-AKTIF (Terbuka untuk semua)'}")
        logger.info(f"🏰 Connected Guilds ({len(bot.guilds)}):")
        for g in bot.guilds:
            logger.info(f"   • {g.name} (ID: {g.id}, Members: {g.member_count})")
        logger.info("==========================================================")

        # Sync App Commands (Slash Commands)
        try:
            synced = await bot.tree.sync()
            logger.info(f"Synced {len(synced)} slash commands globally.")
        except Exception as e:
            logger.debug(f"Slash command sync notice: {e}")

    async def setup():
        await bot.add_cog(vote_cog)
        await bot.add_cog(msg_listener)
        await bot.add_cog(react_listener)

    return bot, setup

async def main():
    config = load_config()
    token = config.discord.bot_token or os.getenv("DISCORD_BOT_TOKEN") or os.getenv("BOT_TOKEN")
    
    if not token:
        logger.error(
            "❌ DISCORD_BOT_TOKEN tidak ditemukan!\n"
            "   Silakan buat file .env (salin dari .env.example) lalu isi DISCORD_BOT_TOKEN=token_bot_anda"
        )
        return

    bot, setup = create_bot(config)
    async with bot:
        await setup()
        logger.info("Menghubungkan ke Discord Gateway...")
        await bot.start(token)

if __name__ == "__main__":
    asyncio.run(main())
