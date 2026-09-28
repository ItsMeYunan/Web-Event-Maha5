from utils.permissions import is_in_stage, is_voting_admin


class Role:
    """Mimics discord.Role hierarchy comparison (operators, not raw position)."""
    def __init__(self, rid, position):
        self.id, self.position = rid, position
    def __ge__(self, other):
        if self.position != other.position:
            return self.position > other.position
        return self.id <= other.id          # ties broken by id, as discord.py does


class Guild:
    def __init__(self, owner_id=None, roles=()):
        self.owner_id = owner_id
        self._roles = {r.id: r for r in roles}
    def get_role(self, rid):
        return self._roles.get(rid)


class Member:
    """Minimal stand-in for discord.Member - only the attributes we read."""
    def __init__(self, member_id=1, voice_channel_id=None, owner_id=None, role_ids=(),
                 top_role=None, guild=None):
        self.id = member_id
        self.voice = type("Voice", (), {
            "channel": type("Chan", (), {"id": voice_channel_id})() if voice_channel_id else None
        })()
        self.guild = guild if guild is not None else type("Guild", (), {"owner_id": owner_id})()
        self.top_role = top_role
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


# --- role hierarchy: anyone at or above min_role_id qualifies ---------------

STAFF = Role(rid=500, position=5)      # the configured threshold
ADMIN = Role(rid=900, position=9)      # above it
MEMBER = Role(rid=100, position=1)     # below it
GUILD = Guild(owner_id=999, roles=(STAFF, ADMIN, MEMBER))


def _member(top_role):
    return Member(member_id=2, guild=GUILD, top_role=top_role)


def test_role_above_threshold_is_admin():
    assert is_voting_admin(_member(ADMIN), admin_role_ids=[], min_role_id=500) is True


def test_role_equal_to_threshold_is_admin():
    assert is_voting_admin(_member(STAFF), admin_role_ids=[], min_role_id=500) is True


def test_role_below_threshold_is_not_admin():
    assert is_voting_admin(_member(MEMBER), admin_role_ids=[], min_role_id=500) is False


def test_no_threshold_configured_falls_back_to_the_allow_list():
    assert is_voting_admin(_member(ADMIN), admin_role_ids=[], min_role_id=None) is False


def test_threshold_role_from_another_guild_is_ignored():
    # get_role returns None for a role this guild does not have -> no crash,
    # and no accidental grant (discord.py raises when comparing across guilds)
    assert is_voting_admin(_member(ADMIN), admin_role_ids=[], min_role_id=4242) is False


def test_member_without_roles_is_not_admin():
    assert is_voting_admin(_member(None), admin_role_ids=[], min_role_id=500) is False
