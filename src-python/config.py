"""Configuration: config.yaml, overridden by environment variables.

Pydantic v2 ignores undeclared keys by default, so anything in config.yaml
without a field below is silently dropped rather than rejected.
"""
import os
from pathlib import Path
from typing import List, Optional

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"


class ServerConfig(BaseModel):
    host: str = "0.0.0.0"        # bind address for the dashboard/web server
    port: int = 3000
    base_url: str = "http://localhost:3000"   # public origin; OAuth redirect is <base_url>/dashboard
    admin_key: str = ""          # set via BACKEND_ADMIN_KEY, never committed


class DiscordConfig(BaseModel):
    bot_token: Optional[str] = None
    client_id: Optional[str] = None   # OAuth2 app id - dashboard login
    client_secret: str = ""           # env-only; required for the token exchange
    command_prefix: str = "!vote"
    admin_role_ids: List[int] = Field(default_factory=list)
    target_stage_channel_id: Optional[int] = None   # pins the stage; else auto-detected
    voice_gate_enabled: bool = False


class VotingConfig(BaseModel):
    min_duration_seconds: int = 10
    max_duration_seconds: int = 3600
    vote_mode: str = "ONE_TIME"          # ONE_TIME | COOLDOWN
    cooldown_seconds: int = 15
    candidate_colors: List[str] = Field(
        default_factory=lambda: ["#06B6D4", "#FACC15", "#FB923C", "#A855F7",
                                 "#10B981", "#EC4899", "#3B82F6", "#84CC16"]
    )


class AppConfig(BaseModel):
    server: ServerConfig = Field(default_factory=ServerConfig)
    discord: DiscordConfig = Field(default_factory=DiscordConfig)
    voting: VotingConfig = Field(default_factory=VotingConfig)


def _bool(value: str) -> bool:
    return value.strip().lower() in ("true", "1", "yes", "on")


def _colors(value: str) -> List[str]:
    return [c.strip() for c in value.split(",") if c.strip()]


# env var -> (config section, field, parser)
ENV_OVERRIDES = {
    "DISCORD_BOT_TOKEN": ("discord", "bot_token", str),
    "DISCORD_CLIENT_ID": ("discord", "client_id", str),
    "DISCORD_CLIENT_SECRET": ("discord", "client_secret", str),
    "COMMAND_PREFIX": ("discord", "command_prefix", str),
    "DISCORD_STAGE_CHANNEL_ID": ("discord", "target_stage_channel_id", int),
    "DISCORD_VOICE_GATE_ENABLED": ("discord", "voice_gate_enabled", _bool),
    "BACKEND_URL": ("server", "base_url", str),
    "HOST": ("server", "host", str),
    "PORT": ("server", "port", int),
    "BACKEND_ADMIN_KEY": ("server", "admin_key", str),
    "VOTE_MODE": ("voting", "vote_mode", str.upper),
    "COOLDOWN_SECONDS": ("voting", "cooldown_seconds", int),
    "CANDIDATE_COLORS": ("voting", "candidate_colors", _colors),
}


def load_config(config_path: Optional[str] = None) -> AppConfig:
    path = Path(config_path) if config_path else CONFIG_PATH
    data = (yaml.safe_load(path.read_text(encoding="utf-8")) or {}) if path.exists() else {}

    for env_var, (section, field, parse) in ENV_OVERRIDES.items():
        raw = os.getenv(env_var)
        if raw:
            data.setdefault(section, {})[field] = parse(raw)

    return AppConfig(**data)
