"""
Permission Helper
Validates whether a Discord member is authorized to administer voting sessions.
"""
from typing import List, Any

def is_voting_admin(member: Any, admin_role_ids: List[int]) -> bool:
    """
    Check if a member has admin authority:
    1. Guild owner
    2. Administrator / Manage Channels / Manage Guild permission
    3. Has one of the admin_role_ids configured in config.yaml
    """
    if not member:
        return False

    # Guild owner
    guild = getattr(member, "guild", None)
    if guild and getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True

    # Standard Discord Permissions
    perms = getattr(member, "guild_permissions", None)
    if perms:
        if perms.administrator or perms.manage_channels or perms.manage_guild:
            return True

    # Custom Admin Roles from YAML
    if admin_role_ids:
        roles = getattr(member, "roles", [])
        member_role_ids = {getattr(r, "id", None) for r in roles}
        for role_id in admin_role_ids:
            if role_id in member_role_ids:
                return True

    return False
