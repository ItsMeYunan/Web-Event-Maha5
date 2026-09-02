import pytest
from utils.duration import parse_duration, format_duration

def test_parse_valid_durations():
    assert parse_duration("30s") == 30
    assert parse_duration("5m") == 300
    assert parse_duration("2h") == 7200
    assert parse_duration("10M") == 600
    assert parse_duration("150") == 150

def test_parse_invalid_durations():
    with pytest.raises(ValueError):
        parse_duration("")
    with pytest.raises(ValueError):
        parse_duration("abc")
    with pytest.raises(ValueError):
        parse_duration("-5m")
    with pytest.raises(ValueError):
        parse_duration("0s")
    with pytest.raises(ValueError):
        parse_duration("10x")

def test_format_durations():
    assert format_duration(30) == "00:30"
    assert format_duration(300) == "05:00"
    assert format_duration(272) == "04:32"
    assert format_duration(3665) == "01:01:05"
    assert format_duration(0) == "00:00"


def test_non_string_raises_valueerror_not_attributeerror():
    # the caller only catches ValueError, so a stray non-str must not escape as
    # AttributeError and kill the command handler
    for bad in (300, 3.5, None, [], {}):
        with pytest.raises(ValueError):
            parse_duration(bad)
