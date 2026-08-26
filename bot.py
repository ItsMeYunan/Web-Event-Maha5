import asyncio

import discord
from discord.ext import commands

from config import cfg

intents = discord.Intents.default()
intents.message_content = True   # needed to read the vote messages
intents.voice_states = True      # needed for the voice/stage channel voting requirement

bot = commands.Bot(command_prefix="!", intents=intents, max_messages=None)


async def main():
    async with bot:
        await bot.load_extension("cogs.voting")
        await bot.start(cfg["bot"]["token"])


if __name__ == "__main__":
    asyncio.run(main())
