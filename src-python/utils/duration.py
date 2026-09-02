"""Duration parsing and display: '30s', '5m', '2h', or bare seconds."""
import re

DURATION = re.compile(r"^(\d+)([smh]?)$", re.IGNORECASE)
UNIT_SECONDS = {"": 1, "s": 1, "m": 60, "h": 3600}


def parse_duration(duration_str: str) -> int:
    """Parse a duration into seconds. Raises ValueError on anything else."""
    match = DURATION.match((duration_str or "").strip().lower())
    if not match:
        raise ValueError(
            f"Invalid duration format: '{duration_str}'. Use '30s', '5m', or '1h'."
        )

    value, unit = match.groups()
    seconds = int(value) * UNIT_SECONDS[unit]
    if seconds <= 0:
        raise ValueError("Duration must be greater than zero.")
    return seconds


def format_duration(seconds: int) -> str:
    """Total seconds as MM:SS, or HH:MM:SS past an hour."""
    seconds = max(seconds, 0)
    hours, rest = divmod(seconds, 3600)
    mins, secs = divmod(rest, 60)
    if hours:
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"
