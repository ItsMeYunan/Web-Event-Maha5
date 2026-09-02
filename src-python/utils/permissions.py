"""Who may run voting commands, and whose vote counts."""
from typing import Any, List, Optional


def is_voting_admin(member: Any, admin_role_ids: List[int]) -> bool:
    """Guild owner, or Administrator/Manage Channels/Manage Guild, or one of the
    admin_role_ids from config.yaml."""
    if not member:
        return False

    guild = getattr(member, "guild", None)
    if guild and getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True

    perms = getattr(member, "guild_permissions", None)
    if perms and (perms.administrator or perms.manage_channels or perms.manage_guild):
        return True

    role_ids = {getattr(r, "id", None) for r in getattr(member, "roles", [])}
    return any(rid in role_ids for rid in admin_role_ids)


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
