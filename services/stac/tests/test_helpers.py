"""Tests for ``debrief_stac._helpers`` (spec 241 — STAC 1.1 upgrade)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

import pytest

from debrief_stac._helpers import (
    DEFAULT_PROVIDERS,
    STAC_EXTENSION_DEBRIEF,
    STAC_EXTENSION_FILE,
    STAC_EXTENSION_PROCESSING,
    iso_now_utc,
    multihash_sha256,
    multihash_sha256_bytes,
    normalise_to_utc,
)


# --- Multihash ---------------------------------------------------------------

# Known multihash for SHA-256("test"): prefix 0x12 (sha2-256), 0x20 (32 bytes),
# then digest 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
_TEST_MULTIHASH = (
    "12209f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
)


def test_multihash_sha256_bytes_matches_known_value() -> None:
    assert multihash_sha256_bytes(b"test") == _TEST_MULTIHASH


def test_multihash_sha256_bytes_empty() -> None:
    # SHA-256("") = e3b0c44...; multihash prefix 1220
    expected = (
        "1220e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
    assert multihash_sha256_bytes(b"") == expected


def test_multihash_sha256_round_trip(tmp_path: Path) -> None:
    p = tmp_path / "fixture.bin"
    p.write_bytes(b"test")
    assert multihash_sha256(p) == _TEST_MULTIHASH


def test_multihash_sha256_handles_str_path(tmp_path: Path) -> None:
    p = tmp_path / "fixture.bin"
    p.write_bytes(b"test")
    assert multihash_sha256(Path(str(p))) == _TEST_MULTIHASH


# --- iso_now_utc -------------------------------------------------------------

_RFC3339_UTC_MS = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


def test_iso_now_utc_format() -> None:
    s = iso_now_utc()
    assert _RFC3339_UTC_MS.match(s), s


# --- normalise_to_utc --------------------------------------------------------


def test_normalise_to_utc_naive_treated_as_utc() -> None:
    assert normalise_to_utc("2026-05-02T10:23:14") == "2026-05-02T10:23:14.000Z"


def test_normalise_to_utc_with_z_suffix() -> None:
    assert normalise_to_utc("2026-05-02T10:23:14Z") == "2026-05-02T10:23:14.000Z"


def test_normalise_to_utc_with_offset() -> None:
    # +02:00 → 08:23:14 UTC
    assert (
        normalise_to_utc("2026-05-02T10:23:14+02:00") == "2026-05-02T08:23:14.000Z"
    )


def test_normalise_to_utc_with_negative_offset() -> None:
    assert (
        normalise_to_utc("2026-05-02T10:23:14-05:00") == "2026-05-02T15:23:14.000Z"
    )


def test_normalise_to_utc_preserves_milliseconds() -> None:
    assert (
        normalise_to_utc("2026-05-02T10:23:14.456Z") == "2026-05-02T10:23:14.456Z"
    )


def test_normalise_to_utc_accepts_datetime_object() -> None:
    dt = datetime(2026, 5, 2, 10, 23, 14, tzinfo=timezone.utc)
    assert normalise_to_utc(dt) == "2026-05-02T10:23:14.000Z"


def test_normalise_to_utc_naive_datetime_treated_as_utc() -> None:
    dt = datetime(2026, 5, 2, 10, 23, 14)
    assert normalise_to_utc(dt) == "2026-05-02T10:23:14.000Z"


def test_normalise_to_utc_raises_on_garbage() -> None:
    with pytest.raises(ValueError, match="Unparseable RFC 3339 timestamp"):
        normalise_to_utc("not-a-date")


# --- DEFAULT_PROVIDERS shape -------------------------------------------------


def test_default_providers_shape() -> None:
    assert isinstance(DEFAULT_PROVIDERS, list)
    assert len(DEFAULT_PROVIDERS) >= 1
    p = DEFAULT_PROVIDERS[0]
    assert p["name"] == "Debrief"
    assert "producer" in p["roles"]
    assert "host" in p["roles"]
    assert p["url"].startswith("https://")
    # Roles must be drawn from the standard STAC enum.
    allowed = {"licensor", "producer", "processor", "host"}
    for entry in DEFAULT_PROVIDERS:
        assert set(entry["roles"]).issubset(allowed)


# --- Extension URI constants -------------------------------------------------


def test_extension_uris_are_https() -> None:
    for uri in (STAC_EXTENSION_DEBRIEF, STAC_EXTENSION_PROCESSING, STAC_EXTENSION_FILE):
        assert uri.startswith("https://")
        assert uri.endswith(".json")


def test_extension_uri_pins_match_spec() -> None:
    # Pins must match the values declared in contracts/factory-api.md and the
    # plan. Bumping a pin requires a deliberate spec/plan update.
    assert STAC_EXTENSION_PROCESSING.endswith("/processing/v1.2.0/schema.json")
    assert STAC_EXTENSION_FILE.endswith("/file/v2.1.0/schema.json")
    assert STAC_EXTENSION_DEBRIEF.endswith("/debrief/v1.0.0/schema.json")
