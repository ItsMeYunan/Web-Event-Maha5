import asyncio
import logging

import discord
from discord.ext import commands

from config import cfg

# discord.py's own helper - handles our loggers too since it configures the
# root logger by default, no need to hand-roll a formatter/handler.
discord.utils.setup_logging(level=logging.DEBUG if cfg["bot"]["debug"] else logging.INFO)

intents = discord.Intents.default()
intents.message_content = True   # needed to read the "1"/"2"/... vote messages
intents.voice_states = True      # needed for the voice-channel voting requirement

# no Members intent / member cache (RAM-heavy on big guilds) - candidates that
# are @mentions get resolved on demand via fetch_member in models.py instead.
# no message cache either, we never look at message history.
bot = commands.Bot(command_prefix="!", intents=intents, max_messages=None)


async def main():
    async with bot:
        await bot.load_extension("cogs.voting")
        await bot.start(cfg["bot"]["token"])


if __name__ == "__main__":
    asyncio.run(main())
