"""
Duration Parser Utility
Parses strings like '30s', '5m', '2h' into total seconds.
"""
import re

DURATION_REGEX = re.compile(r"^(\d+)([smh])$", re.IGNORECASE)

def parse_duration(duration_str: str) -> int:
    """
    Parse a duration string into seconds.
    Supported units:
      s: seconds (e.g. '30s')
      m: minutes (e.g. '5m')
      h: hours (e.g. '1h')
      
    Raises ValueError on invalid formats.
    """
    if not duration_str or not isinstance(duration_str, str):
        raise ValueError("Duration string must not be empty.")

    clean_str = duration_str.strip().lower()
    
    # Check purely numeric (assume seconds)
    if clean_str.isdigit():
        val = int(clean_str)
        if val <= 0:
            raise ValueError("Duration must be a positive integer.")
        return val

    match = DURATION_REGEX.match(clean_str)
    if not match:
        raise ValueError(
            f"Invalid duration format: '{duration_str}'. Use format like '30s', '5m', or '1h'."
        )

    val_str, unit = match.groups()
    val = int(val_str)

    if val <= 0:
        raise ValueError("Duration value must be greater than zero.")

    if unit == 's':
        return val
    elif unit == 'm':
        return val * 60
    elif unit == 'h':
        return val * 3600
    
    raise ValueError(f"Unknown time unit: '{unit}'")

def format_duration(seconds: int) -> str:
    """Format total seconds into MM:SS or HH:MM:SS."""
    if seconds < 0:
        seconds = 0
    hours = seconds // 3600
    mins = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"
