"""
Stage Gate Validator
Verifies whether a Discord voter is currently inside the required Stage Channel.
"""
import discord
from typing import Optional
import logging

logger = logging.getLogger("discord_voting.stage_gate")

class StageGateValidator:
    def __init__(self, target_stage_channel_id: Optional[int], voice_gate_enabled: bool = True):
        self.target_stage_channel_id = target_stage_channel_id
        self.voice_gate_enabled = voice_gate_enabled

    def is_eligible(self, member: discord.Member) -> bool:
        """
        Evaluate voter eligibility:
        - If voice_gate_enabled is False or target_stage_channel_id is not set -> True (Open to everyone)
        - Otherwise, member must be connected to member.voice.channel with ID == target_stage_channel_id
        """
        if not self.voice_gate_enabled or not self.target_stage_channel_id:
            return True

        if not hasattr(member, "voice") or member.voice is None or member.voice.channel is None:
            logger.debug(f"Member {member.display_name} ({member.id}) is not in any voice/stage channel.")
            return False

        is_in_stage = member.voice.channel.id == self.target_stage_channel_id
        if not is_in_stage:
            logger.debug(
                f"Member {member.display_name} in channel {member.voice.channel.id}, required {self.target_stage_channel_id}"
            )
        return is_in_stage
