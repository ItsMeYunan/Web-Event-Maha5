"""Who may run voting commands, and whose vote counts."""
from typing import Any, List, Optional


def is_voting_admin(
    member: Any,
    admin_role_ids: List[int],
    min_role_id: Optional[int] = None,
) -> bool:
    """Whether a member may run voting commands. Any one of:

    1. guild owner
    2. Administrator / Manage Channels / Manage Server
    3. holds a role listed in ``discord.admin_role_ids``
    4. their highest role sits at or above ``discord.min_role_id``
    """
    if not member:
        return False

    guild = getattr(member, "guild", None)
    if guild and getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True

    perms = getattr(member, "guild_permissions", None)
    if perms and (perms.administrator or perms.manage_channels or perms.manage_guild):
        return True

    role_ids = {getattr(r, "id", None) for r in getattr(member, "roles", [])}
    if any(rid in role_ids for rid in admin_role_ids):
        return True

    return _outranks(member, guild, min_role_id)


def _outranks(member: Any, guild: Any, min_role_id: Optional[int]) -> bool:
    """True if the member's top role is at or above the configured threshold.

    Uses Role's comparison operators, not Role.position: discord.py documents
    that several roles can share a position, so comparing positions directly is
    "prone to subtle bugs". get_role also keeps both sides in the same guild,
    which the operators require - they raise across guilds.
    """
    if not min_role_id or guild is None:
        return False

    get_role = getattr(guild, "get_role", None)
    threshold = get_role(min_role_id) if callable(get_role) else None
    top_role = getattr(member, "top_role", None)
    if threshold is None or top_role is None:
        return False        # role belongs to another guild, or member has none

    return bool(top_role >= threshold)


def is_in_stage(member: Any, stage_channel_id: Optional[int]) -> bool:
    """True only if the member is connected to *this* session's stage channel.

    Any-voice-channel would be trivially bypassed by joining an unrelated (or
    private) voice channel, so the check is against one specific id. Fails
    closed: no stage channel means nobody qualifies, never everybody.
    """
    if not stage_channel_id:
        return False
    voice = getattr(member, "voice", None)
    channel = getattr(voice, "channel", None) if voice else None
    return getattr(channel, "id", None) == stage_channel_id
