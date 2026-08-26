import re
import time
import discord


def parse_duration(text):
    m = re.match(r"^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hour|hours)$", text.strip().lower())
    if not m:
        raise ValueError("bad duration")
    amount = int(m.group(1))
    unit = m.group(2)
    if unit.startswith("s"):
        return amount
    if unit.startswith("m"):
        return amount * 60
    return amount * 3600

async def build_candidate(guild, raw_name, index, colors):
    # fetch_member instead of the cached get_member so the bot doesn't need
    # the privileged Members intent (and its full-guild-member RAM cost) -
    # only pays the API call when a candidate is actually a mention.
    color = colors[index % len(colors)]
    m = re.match(r"^<@!?(\d+)>$", raw_name)
    if m:
        try:
            member = await guild.fetch_member(int(m.group(1)))
            return {"name": member.display_name, "avatar_url": str(member.display_avatar.url), "letter": None, "color": color}
        except discord.NotFound:
            pass
    return {"name": raw_name, "avatar_url": None, "letter": raw_name[0].upper() if raw_name else "?", "color": color}

def vote_counts(session):
    counts = [0] * len(session.candidates)
    for idx in session.votes.values():
        counts[idx] += 1
    return counts

def bar_width(votes, max_votes, max_px):
    if max_votes <= 0:
        return 6
    return max(int(max_px * votes / max_votes), 6)

class Session:
    def __init__(self, session_id, guild, channel, result_channel, candidates, duration):
        self.id = session_id
        self.guild = guild
        self.channel = channel
        self.result_channel = result_channel
        self.candidates = candidates
        self.votes = {}            # user_id -> candidate index
        self.last_vote_time = {}   # user_id -> timestamp
        self.duration = duration
        self.end_time = time.time() + duration
        self.active = True
        self.ended = False
        self.timer_task = None

sessions = {}          # session_id -> Session, kept around for the web pages
active_sessions = {}   # guild_id -> Session, only one running vote per server
