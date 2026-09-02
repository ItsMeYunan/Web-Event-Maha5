from utils.permissions import is_in_stage, is_voting_admin


class Member:
    """Minimal stand-in for discord.Member - only the attributes we read."""
    def __init__(self, member_id=1, voice_channel_id=None, owner_id=None, role_ids=()):
        self.id = member_id
        self.voice = type("Voice", (), {
            "channel": type("Chan", (), {"id": voice_channel_id})() if voice_channel_id else None
        })()
        self.guild = type("Guild", (), {"owner_id": owner_id})()
        self.guild_permissions = type("Perms", (), {
            "administrator": False, "manage_channels": False, "manage_guild": False
        })()
        self.roles = [type("Role", (), {"id": rid})() for rid in role_ids]


def test_member_in_the_session_stage_may_vote():
    assert is_in_stage(Member(voice_channel_id=12345), 12345) is True


def test_another_voice_channel_does_not_count():
    # the abuse case: joining any unrelated (or private) voice channel must not
    # satisfy a gate meant for the event's stage
    assert is_in_stage(Member(voice_channel_id=99999), 12345) is False


def test_member_not_in_voice_may_not():
    assert is_in_stage(Member(), 12345) is False


def test_missing_stage_channel_fails_closed():
    # no stage to check against must reject everyone, never admit everyone
    assert is_in_stage(Member(voice_channel_id=12345), None) is False
    assert is_in_stage(Member(), None) is False


def test_guild_owner_is_admin():
    assert is_voting_admin(Member(member_id=1, owner_id=1), admin_role_ids=[]) is True


def test_configured_role_is_admin():
    member = Member(member_id=2, owner_id=999, role_ids=[77778888])
    assert is_voting_admin(member, admin_role_ids=[77778888]) is True
    assert is_voting_admin(member, admin_role_ids=[11112222]) is False


def test_no_member_is_not_admin():
    assert is_voting_admin(None, admin_role_ids=[1]) is False
