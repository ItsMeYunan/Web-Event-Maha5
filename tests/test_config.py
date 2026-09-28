
from config import AppConfig, load_config


def test_secrets_default_empty_and_are_not_in_config_yaml():
    cfg = AppConfig()
    assert cfg.discord.client_secret == ""
    assert cfg.server.admin_key == ""
    yaml_text = open("config.yaml", encoding="utf-8").read()
    for secret in ("client_secret", "admin_key", "bot_token"):
        assert secret not in yaml_text, f"{secret} must live in .env, not config.yaml"


def test_dashboard_auth_fields_load_from_env(monkeypatch):
    monkeypatch.setenv("DISCORD_CLIENT_ID", "123456789012345678")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "s3cret")
    monkeypatch.setenv("HOST", "127.0.0.1")
    monkeypatch.setenv("PORT", "8080")
    cfg = load_config()
    assert cfg.discord.client_id == "123456789012345678"
    assert cfg.discord.client_secret == "s3cret"
    assert cfg.server.host == "127.0.0.1"
    assert cfg.server.port == 8080
