"""Discord Live Real-Time Voting bot - gateway entrypoint."""
import asyncio
import logging
import sys
from contextlib import aclosing

import discord
from discord.ext import commands

from commands.vote_cmd import VoteCommands
from config import load_config
from listeners.message_listener import MessageVoteListener
from services.api import BunApiClient
from services.timer import SessionTimerManager
from services.webserver import WebServer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("discord_voting")


class VotingBot(commands.Bot):
    """setup_hook runs once per process, after login but before the gateway
    connects (unlike on_ready, which re-fires on every reconnect) - the
    correct place for a one-time slash-command sync."""
    async def setup_hook(self) -> None:
        synced = await self.tree.sync()
        logger.info(f"🔗 Slash commands synced: {len(synced)}")


async def main():
    config = load_config()
    if not config.discord.bot_token:
        logger.error(
            "❌ DISCORD_BOT_TOKEN tidak ditemukan!\n"
            "   Salin .env.example ke .env lalu isi DISCORD_BOT_TOKEN=token_bot_anda"
        )
        return

    intents = discord.Intents.default()
    intents.message_content = True   # to read the "1"/"2"/... vote messages
    intents.voice_states = True      # for the stage-channel gate

    bot = VotingBot(
        command_prefix=commands.when_mentioned_or(config.discord.command_prefix + " "),
        intents=intents,
        help_command=None,
    )

    @bot.event
    async def on_ready():
        logger.info(f"✨ BOT ONLINE: {bot.user}")
        logger.info(f"🌐 Backend: {config.server.base_url}")
        logger.info(
            f"🎙️ Stage gating: {'AKTIF' if config.discord.voice_gate_enabled else 'NON-AKTIF'}"
        )
        for guild in bot.guilds:
            logger.info(f"   • {guild.name} ({guild.id})")

    api_client = BunApiClient(config.server.base_url, config.server.admin_key)
    web_server = WebServer(bot, config)

    # aclosing is stdlib and guarantees the aiohttp session is released on any exit.
    async with aclosing(api_client), bot:
        vote_cog = VoteCommands(bot, config, api_client, SessionTimerManager())
        await bot.add_cog(vote_cog)
        await bot.add_cog(MessageVoteListener(bot, vote_cog, api_client))
        await web_server.start()
        try:
            logger.info("Menghubungkan ke Discord Gateway...")
            await bot.start(config.discord.bot_token)
        finally:
            await web_server.stop()


if __name__ == "__main__":
    asyncio.run(main())
