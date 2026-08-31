import pytest
from unittest.mock import MagicMock
from services.stage_gate import StageGateValidator

class DummyChannel:
    def __init__(self, channel_id: int):
        self.id = channel_id

class DummyVoiceState:
    def __init__(self, channel_id: int = None):
        self.channel = DummyChannel(channel_id) if channel_id else None

class DummyMember:
    def __init__(self, member_id: int, name: str, voice_channel_id: int = None):
        self.id = member_id
        self.name = name
        self.display_name = name
        self.voice = DummyVoiceState(voice_channel_id) if voice_channel_id else None

def test_stage_gate_eligible_member():
    validator = StageGateValidator(target_stage_channel_id=12345, voice_gate_enabled=True)
    member_in_stage = DummyMember(1, "VoterAlex", voice_channel_id=12345)
    assert validator.is_eligible(member_in_stage) is True

def test_stage_gate_wrong_channel_rejected():
    validator = StageGateValidator(target_stage_channel_id=12345, voice_gate_enabled=True)
    member_in_general = DummyMember(2, "VoterBob", voice_channel_id=99999)
    assert validator.is_eligible(member_in_general) is False

def test_stage_gate_no_voice_rejected():
    validator = StageGateValidator(target_stage_channel_id=12345, voice_gate_enabled=True)
    member_no_voice = DummyMember(3, "VoterCharlie", voice_channel_id=None)
    assert validator.is_eligible(member_no_voice) is False

def test_stage_gate_disabled_allows_everyone():
    validator = StageGateValidator(target_stage_channel_id=12345, voice_gate_enabled=False)
    member_no_voice = DummyMember(4, "VoterDelta", voice_channel_id=None)
    assert validator.is_eligible(member_no_voice) is True
