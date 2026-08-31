"""
Stage Gate Validator
Verifies whether a Discord voter is currently inside the required Stage Channel.
Supports dynamic per-session stage channel IDs and fallback global configuration.
"""
import discord
from typing import Optional, Any
import logging

logger = logging.getLogger("discord_voting.stage_gate")

class StageGateValidator:
    def __init__(self, target_stage_channel_id: Optional[int] = None, voice_gate_enabled: bool = False):
        self.target_stage_channel_id = target_stage_channel_id
        self.voice_gate_enabled = voice_gate_enabled

    def is_eligible(self, member: Any, session_stage_channel_id: Optional[int] = None) -> bool:
        """
        Evaluate voter eligibility:
        - If voice_gate_enabled is False -> True (Anyone in text channel can vote).
        - Target channel resolves from session_stage_channel_id if specified, else self.target_stage_channel_id.
        - If no stage channel is targeted at all -> True.
        """
        if not self.voice_gate_enabled:
            return True

        target_id = session_stage_channel_id or self.target_stage_channel_id
        if not target_id:
            return True

        voice_state = getattr(member, "voice", None)
        if not voice_state:
            return False

        voice_channel = getattr(voice_state, "channel", None)
        if not voice_channel:
            return False

        channel_id = getattr(voice_channel, "id", None)
        is_match = channel_id == target_id
        if not is_match:
            logger.debug(
                f"Voter {getattr(member, 'display_name', member)} in voice channel {channel_id} (expected {target_id})"
            )
        return is_match
