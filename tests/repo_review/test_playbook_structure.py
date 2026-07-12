"""Structural checks for the review playbooks + tuning logic (T012, T043)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from types import ModuleType

PLAYBOOK_DIR = Path(__file__).resolve().parents[2] / ".claude/review/playbooks"

# Each playbook owns exactly one heuristic-id prefix.
PREFIX_BY_FILE = {
    "constitution.md": "CC",
    "correctness.md": "CB",
    "tech-debt.md": "TD",
    "test-quality.md": "TQ",
}

_HEURISTIC = re.compile(r"\b(CC|CB|TD|TQ)-(\d+)\b")


def _ids_in(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return [f"{prefix}-{num}" for prefix, num in _HEURISTIC.findall(text)]


def test_every_playbook_exists() -> None:
    for name in PREFIX_BY_FILE:
        assert (PLAYBOOK_DIR / name).exists(), f"missing playbook {name}"


def test_playbook_uses_only_its_own_prefix() -> None:
    for name, prefix in PREFIX_BY_FILE.items():
        path = PLAYBOOK_DIR / name
        # Heuristic *definitions* (bold, start-of-line) must use the file's prefix;
        # cross-references to other prefixes in prose are allowed.
        defined = re.findall(r"^- \*\*([A-Z]{2})-\d+\*\*", path.read_text(encoding="utf-8"), re.M)
        assert defined, f"{name} defines no heuristics"
        stray = {p for p in defined if p != prefix}
        assert not stray, f"{name} defines foreign-prefix heuristics {stray}"


def test_heuristic_ids_globally_unique() -> None:
    seen: dict[str, str] = {}
    for name, prefix in PREFIX_BY_FILE.items():
        path = PLAYBOOK_DIR / name
        defined = re.findall(rf"^- \*\*({prefix}-\d+)\*\*", path.read_text(encoding="utf-8"), re.M)
        for hid in defined:
            assert hid not in seen, f"{hid} defined in both {seen[hid]} and {name}"
            seen[hid] = name
    assert len(seen) >= 12  # sanity: playbooks are populated, not stubs


@pytest.mark.parametrize(
    ("heuristic", "confirmed", "refuted", "expected"),
    [
        ("CB-03", 0, 4, "prune"),  # produced candidates, confirmed none
        ("CB-01", 5, 1, "strengthen"),  # high yield, majority confirmed
        ("CB-05", 1, 0, "keep"),  # low volume, not enough to strengthen
        ("CB-05", 2, 3, "keep"),  # minority confirmed but not zero
        ("CC-12", 0, 0, "keep"),  # never fired
        ("(unprompted)", 3, 0, "add"),  # recurring unprompted → add a heuristic
        ("(unprompted)", 1, 0, "keep"),
    ],
)
def test_tuning_recommendation(
    rl: ModuleType, heuristic: str, confirmed: int, refuted: int, expected: str
) -> None:
    assert rl.tuning_recommendation(heuristic, confirmed, refuted) == expected
