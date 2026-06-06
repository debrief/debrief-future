"""Shared internal helpers for ``debrief_stac``.

Single internal-helpers module per research.md decision 12. Hosts:
- multihash-encoded SHA-256 helpers for ``file:checksum``
- timestamp helpers (RFC 3339 UTC)
- ``DEFAULT_PROVIDERS`` for ``properties.providers``
- STAC extension URI constants

The leading underscore signals "internal to ``services/stac/``"; nothing
outside this package should import from this module.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from multiformats import multihash  # type: ignore[reportMissingImports]

# --- STAC extension URI constants ---------------------------------------------

STAC_EXTENSION_DEBRIEF: str = "https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json"
STAC_EXTENSION_PROCESSING: str = "https://stac-extensions.github.io/processing/v1.2.0/schema.json"
STAC_EXTENSION_FILE: str = "https://stac-extensions.github.io/file/v2.1.0/schema.json"


# --- Default providers --------------------------------------------------------

DEFAULT_PROVIDERS: list[dict[str, Any]] = [
    {
        "name": "Debrief",
        "roles": ["producer", "host"],
        "url": "https://debrief.info",
    }
]


# --- Multihash checksums ------------------------------------------------------

_SHA2_256_CODEC = multihash.get("sha2-256")


def multihash_sha256_bytes(data: bytes) -> str:
    """Compute the multihash-encoded SHA-256 of an in-memory bytes object.

    Returns a lower-case hex string in multihash format:
    ``<varint algo=0x12><varint length=0x20><32 bytes digest>``.
    """
    digest: bytes = _SHA2_256_CODEC.digest(data)
    return digest.hex()


def multihash_sha256(path: Path) -> str:
    """Compute the multihash-encoded SHA-256 of a file's bytes.

    Returns a lower-case hex string in multihash format (see
    :func:`multihash_sha256_bytes`).
    """
    return multihash_sha256_bytes(Path(path).read_bytes())


# --- Timestamps ---------------------------------------------------------------


def iso_now_utc() -> str:
    """RFC 3339 UTC timestamp with millisecond precision.

    Example: ``'2026-05-02T10:23:14.123Z'``.
    """
    now = datetime.now(UTC)
    millis = now.microsecond // 1000
    return f"{now.strftime('%Y-%m-%dT%H:%M:%S')}.{millis:03d}Z"


def normalise_to_utc(ts: str | datetime) -> str:
    """Coerce any RFC 3339 timestamp (timezone-naive accepted) to UTC RFC 3339.

    Raises:
        ValueError: If the input cannot be parsed.
    """
    if isinstance(ts, datetime):
        dt = ts
    else:
        s = ts.strip()
        # ``datetime.fromisoformat`` in Python 3.11+ accepts the trailing ``Z``
        # form via the ``+00:00`` suffix workaround.
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(s)
        except ValueError as exc:
            raise ValueError(f"Unparseable RFC 3339 timestamp: {ts!r}") from exc

    # Treat timezone-naive as UTC (best-effort recovery — better than silently
    # mislabelling).
    dt = dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)

    millis = dt.microsecond // 1000
    return f"{dt.strftime('%Y-%m-%dT%H:%M:%S')}.{millis:03d}Z"


__all__ = [
    "DEFAULT_PROVIDERS",
    "STAC_EXTENSION_DEBRIEF",
    "STAC_EXTENSION_FILE",
    "STAC_EXTENSION_PROCESSING",
    "iso_now_utc",
    "multihash_sha256",
    "multihash_sha256_bytes",
    "normalise_to_utc",
]
