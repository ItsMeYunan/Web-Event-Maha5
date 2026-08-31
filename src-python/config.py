"""
Configuration Loader for Discord Live Voting Bot
Reads config.yaml and environment variables.
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
    command_prefix: str = "!vote"
    admin_role_ids: List[int] = Field(default_factory=list)
    target_guild_id: Optional[int] = None
    target_stage_channel_id: Optional[int] = None
    voice_gate_enabled: bool = True

class VotingConfig(BaseModel):
    default_duration_seconds: int = 300
    min_duration_seconds: int = 10
    max_duration_seconds: int = 3600
    vote_mode: str = "ONE_TIME"
    cooldown_seconds: int = 15
    candidate_colors: List[str] = Field(
        default_factory=lambda: ["#06B6D4", "#FACC15", "#FB923C", "#A855F7"]
    )

class AppConfig(BaseModel):
    server: ServerConfig = Field(default_factory=ServerConfig)
    discord: DiscordConfig = Field(default_factory=DiscordConfig)
    voting: VotingConfig = Field(default_factory=VotingConfig)

def load_config(config_path: Optional[str] = None) -> AppConfig:
    """Load configuration from config.yaml or return default."""
    if not config_path:
        # Search relative to current file or working directory
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
            
            # Override with environment variables if available
            admin_key_env = os.getenv("BACKEND_ADMIN_KEY") or os.getenv("ADMIN_KEY")
            if admin_key_env and "server" in data:
                data["server"]["admin_key"] = admin_key_env
                
            base_url_env = os.getenv("BACKEND_URL") or os.getenv("BASE_URL")
            if base_url_env and "server" in data:
                data["server"]["base_url"] = base_url_env

            return AppConfig(**data)
            
    return AppConfig()
