"""
Dynamic Configuration Loader for Discord Live Voting Bot
Reads config.yaml and overrides with environment variables (.env) seamlessly.
"""
from pathlib import Path
import os
import yaml
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

class ServerConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 3000
    base_url: str = "http://localhost:3000"
    admin_key: str = "maha5_live_secret_key_2026"

class DiscordConfig(BaseModel):
    bot_token: Optional[str] = None
    client_id: Optional[str] = None
    command_prefix: str = "!vote"
    admin_role_ids: List[int] = Field(default_factory=list)
    target_guild_id: Optional[int] = None
    target_stage_channel_id: Optional[int] = None
    voice_gate_enabled: bool = False

class VotingConfig(BaseModel):
    default_duration_seconds: int = 300
    min_duration_seconds: int = 5
    max_duration_seconds: int = 7200
    vote_mode: str = "ONE_TIME"
    cooldown_seconds: int = 15
    candidate_colors: List[str] = Field(
        default_factory=lambda: ["#06B6D4", "#FACC15", "#FB923C", "#A855F7", "#10B981", "#EC4899", "#3B82F6"]
    )

class AppConfig(BaseModel):
    server: ServerConfig = Field(default_factory=ServerConfig)
    discord: DiscordConfig = Field(default_factory=DiscordConfig)
    voting: VotingConfig = Field(default_factory=VotingConfig)

def load_config(config_path: Optional[str] = None) -> AppConfig:
    """Load configuration from config.yaml with full environment variable overrides."""
    data = {}

    if not config_path:
        possible_paths = [
            Path.cwd() / "config.yaml",
            Path(__file__).parent.parent / "config.yaml",
            Path(__file__).parent / "config.yaml",
        ]
        for p in possible_paths:
            if p.exists():
                config_path = str(p)
                break

    if config_path and Path(config_path).exists():
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

    # Initialize sub-dictionaries if missing
    if "server" not in data: data["server"] = {}
    if "discord" not in data: data["discord"] = {}
    if "voting" not in data: data["voting"] = {}

    # 1. Environment Variable Overrides for Server
    if os.getenv("BACKEND_ADMIN_KEY") or os.getenv("ADMIN_KEY") or os.getenv("SECRET_KEY"):
        data["server"]["admin_key"] = os.getenv("BACKEND_ADMIN_KEY") or os.getenv("ADMIN_KEY") or os.getenv("SECRET_KEY")

    if os.getenv("BACKEND_URL") or os.getenv("BASE_URL"):
        data["server"]["base_url"] = os.getenv("BACKEND_URL") or os.getenv("BASE_URL")

    # 2. Environment Variable Overrides for Discord
    if os.getenv("DISCORD_BOT_TOKEN") or os.getenv("BOT_TOKEN"):
        data["discord"]["bot_token"] = os.getenv("DISCORD_BOT_TOKEN") or os.getenv("BOT_TOKEN")

    if os.getenv("DISCORD_CLIENT_ID"):
        data["discord"]["client_id"] = os.getenv("DISCORD_CLIENT_ID")

    if os.getenv("COMMAND_PREFIX"):
        data["discord"]["command_prefix"] = os.getenv("COMMAND_PREFIX")

    if os.getenv("DISCORD_GUILD_ID"):
        try:
            data["discord"]["target_guild_id"] = int(os.getenv("DISCORD_GUILD_ID"))
        except ValueError:
            pass

    if os.getenv("DISCORD_STAGE_CHANNEL_ID"):
        try:
            data["discord"]["target_stage_channel_id"] = int(os.getenv("DISCORD_STAGE_CHANNEL_ID"))
        except ValueError:
            pass

    if os.getenv("DISCORD_VOICE_GATE_ENABLED") is not None or os.getenv("VOICE_GATE_ENABLED") is not None:
        val = (os.getenv("DISCORD_VOICE_GATE_ENABLED") or os.getenv("VOICE_GATE_ENABLED") or "").strip().lower()
        data["discord"]["voice_gate_enabled"] = val in ["true", "1", "yes", "on"]

    # 3. Environment Variable Overrides for Voting
    if os.getenv("VOTE_MODE"):
        data["voting"]["vote_mode"] = os.getenv("VOTE_MODE").upper()

    if os.getenv("COOLDOWN_SECONDS"):
        try:
            data["voting"]["cooldown_seconds"] = int(os.getenv("COOLDOWN_SECONDS"))
        except ValueError:
            pass

    if os.getenv("CANDIDATE_COLORS"):
        colors = [c.strip() for c in os.getenv("CANDIDATE_COLORS").split(",") if c.strip()]
        if colors:
            data["voting"]["candidate_colors"] = colors

    return AppConfig(**data)
