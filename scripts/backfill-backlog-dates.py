#!/usr/bin/env python3
"""
One-shot script that adds `Epic`, `Created`, `Updated` columns to BACKLOG.md's
Items table, normalises the Epics table, and backfills `Created`/`Updated` from
git history.

Usage:
    python scripts/backfill-backlog-dates.py [--dry-run] [--miss-file PATH]

Idempotent: re-running the script on a partly-refactored file leaves
already-populated cells untouched.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

SENTINEL = "2025-01-01"
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKLOG_PATH = REPO_ROOT / "BACKLOG.md"
DEFAULT_MISS_FILE = REPO_ROOT / "specs" / "242-backlog-navigator" / "evidence" / "backfill-misses.txt"

# Pre-refactor Items header (9 columns)
ITEMS_HEADER_PRE = "| ID | Category | Description | V | M | A | Total | Complexity | Status |"
ITEMS_SEPARATOR_PRE = "|----|----------|-------------|---|---|---|-------|------------|--------|"

# Post-refactor Items header (12 columns)
ITEMS_HEADER_POST = "| ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated |"
ITEMS_SEPARATOR_POST = "|----|----------|-------------|---|---|---|-------|------------|--------|------|---------|---------|"

# Pre-refactor Epics header (5 columns)
EPICS_HEADER_PRE = "| ID | Title | Description | Status | Items |"
EPICS_SEPARATOR_PRE = "|----|-------|-------------|--------|-------|"

# Post-refactor Epics header (4 columns)
EPICS_HEADER_POST = "| ID | Title | Description | Status |"
EPICS_SEPARATOR_POST = "|----|-------|-------------|--------|"


# Regex: extract item id from a row (handles strikethrough wrapping).
ROW_ID_RE = re.compile(r"^~?~?\|\s*(?:~~)?(\d+)(?:~~)?\s*\|")
# Capture leading [[E##] tag inside Description column.
EPIC_TAG_RE = re.compile(r"\[\[(E\d{2})\]")


@dataclass
class ParsedRow:
    raw: str
    struck: bool
    cells: list[str]


def split_cells(line: str) -> list[str]:
    """Split a markdown table row into cell values (un-escaped)."""
    s = line.strip()
    if s.startswith("~~") and s.endswith("~~"):
        s = s[2:-2]
    if not (s.startswith("|") and s.endswith("|")):
        raise ValueError(f"not a table row: {line!r}")
    inner = s[1:-1]
    cells = []
    buf = []
    i = 0
    while i < len(inner):
        ch = inner[i]
        if ch == "\\" and i + 1 < len(inner) and inner[i + 1] == "|":
            buf.append("|")
            i += 2
            continue
        if ch == "|":
            cells.append("".join(buf).strip())
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    cells.append("".join(buf).strip())
    return cells


def join_cells(cells: list[str], struck: bool = False) -> str:
    """Re-emit a row with single-space padding."""
    escaped = [c.replace("|", "\\|") for c in cells]
    inner = "|".join(f" {c} " for c in escaped)
    row = f"|{inner}|"
    return f"~~{row}~~" if struck else row


def git_first_date(item_id: str) -> str | None:
    """Return the YYYY-MM-DD of the commit that introduced a row whose first
    column equals `item_id`. Uses `git log --reverse --diff-filter=A -G`."""
    pattern = rf"^~?~?\| (~~)?{item_id}(~~)? \|"
    cmd = [
        "git",
        "log",
        "--reverse",
        "--diff-filter=A",
        "--pretty=format:%ad",
        "--date=short",
        "-G",
        pattern,
        "--",
        "BACKLOG.md",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_ROOT)
    if out.returncode != 0:
        return None
    lines = [ln.strip() for ln in out.stdout.splitlines() if ln.strip()]
    return lines[0] if lines else None


def git_last_date(item_id: str) -> str | None:
    """Return the YYYY-MM-DD of the most recent commit touching a row whose
    first column equals `item_id`."""
    pattern = rf"^~?~?\| (~~)?{item_id}(~~)? \|"
    cmd = [
        "git",
        "log",
        "-1",
        "--pretty=format:%ad",
        "--date=short",
        "-G",
        pattern,
        "--",
        "BACKLOG.md",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO_ROOT)
    if out.returncode != 0:
        return None
    line = out.stdout.strip()
    return line.splitlines()[0] if line else None


def refactor_items_row(row: str, fallback_dates: dict[str, tuple[str, str]],
                       misses: list[str]) -> str:
    """Convert a 9-column row into a 12-column row with Epic/Created/Updated."""
    if not row.strip().startswith(("|", "~")):
        return row

    s = row.rstrip("\n")
    struck = s.strip().startswith("~~") and s.strip().endswith("~~")

    try:
        cells = split_cells(s)
    except ValueError:
        return row

    if len(cells) == 12:
        # already refactored — leave alone
        return row
    if len(cells) != 9:
        return row

    # If the row was rendered with per-cell ~~..~~ wrapping (instead of
    # row-level), promote it to row-level wrapping by stripping the per-cell
    # markers and remembering that the row is struck.
    per_cell_struck = (
        not struck
        and any(c.startswith("~~") and c.endswith("~~") for c in cells)
        and any("complete" in c for c in cells)
    )
    if per_cell_struck:
        cells = [_strip_per_cell_strike(c) for c in cells]
        struck = True

    item_id = cells[0]
    description = cells[2]
    epic_match = EPIC_TAG_RE.search(description)
    epic = epic_match.group(1) if epic_match else ""

    cached = fallback_dates.get(item_id)
    if cached is None:
        created = git_first_date(item_id) or SENTINEL
        updated = git_last_date(item_id) or created
        if created == SENTINEL:
            misses.append(item_id)
        fallback_dates[item_id] = (created, updated)
    else:
        created, updated = cached

    new_cells = cells + [epic, created, updated]
    return join_cells(new_cells, struck=struck) + "\n"


def _strip_per_cell_strike(value: str) -> str:
    """Remove `~~ ... ~~` wrapping (and pre-existing inline strikethroughs)
    from a cell value. The spec normalises Epic-row strikethrough away."""
    s = value.strip()
    while s.startswith("~~") and s.endswith("~~"):
        s = s[2:-2].strip()
    return s


def refactor_epics_row(row: str) -> str:
    """Convert a 5-column epic row into a 4-column row by dropping `Items`,
    removing strikethrough (row-level AND per-cell), and renaming `024` to `E13`."""
    s = row.rstrip("\n")
    if not s.strip().startswith(("|", "~")):
        return row
    struck_row = s.strip().startswith("~~") and s.strip().endswith("~~")
    try:
        cells = split_cells(s)
    except ValueError:
        return row
    if len(cells) == 4:
        return row  # already refactored
    if len(cells) != 5:
        return row

    # Strip per-cell strikethrough wrappers.
    cells = [_strip_per_cell_strike(c) for c in cells]

    epic_id = cells[0]
    if epic_id == "024":
        epic_id = "E13"
        cells[0] = epic_id

    title, description, status, _items = cells[1], cells[2], cells[3], cells[4]

    # If row was struck (or contained ~~complete~~), force status to complete.
    if struck_row or "complete" in status.lower():
        status = "complete"

    return join_cells([epic_id, title, description, status], struck=False) + "\n"


def refactor(text: str, misses: list[str]) -> str:
    lines = text.split("\n")
    out: list[str] = []
    cache: dict[str, tuple[str, str]] = {}

    in_items = False
    in_epics = False
    items_header_seen = False
    epics_header_seen = False
    in_html_comment = False

    for line in lines:
        stripped = line.strip()

        # Track HTML-comment regions and pass them through verbatim.
        if "<!--" in line and "-->" not in line:
            in_html_comment = True
            out.append(line)
            continue
        if in_html_comment:
            if "-->" in line:
                in_html_comment = False
            out.append(line)
            continue

        # Items header transitions
        if not items_header_seen and stripped == ITEMS_HEADER_PRE.strip():
            out.append(ITEMS_HEADER_POST)
            items_header_seen = True
            in_items = True
            in_epics = False
            continue
        if items_header_seen and in_items and stripped.startswith("|--"):
            out.append(ITEMS_SEPARATOR_POST)
            continue
        if items_header_seen and stripped == ITEMS_HEADER_POST.strip():
            # already refactored; pass through
            out.append(line)
            in_items = True
            in_epics = False
            continue

        # Epics header transitions
        if not epics_header_seen and stripped == EPICS_HEADER_PRE.strip():
            out.append(EPICS_HEADER_POST)
            epics_header_seen = True
            in_epics = True
            in_items = False
            continue
        if epics_header_seen and in_epics and stripped.startswith("|--"):
            out.append(EPICS_SEPARATOR_POST)
            continue
        if epics_header_seen and stripped == EPICS_HEADER_POST.strip():
            out.append(line)
            in_epics = True
            in_items = False
            continue

        # Item rows in items table
        if in_items and ROW_ID_RE.match(stripped):
            refactored = refactor_items_row(line + "\n", cache, misses).rstrip("\n")
            out.append(refactored)
            continue

        # Epic rows in epics table
        if in_epics and (
            stripped.startswith("|") or stripped.startswith("~~|")
        ) and not stripped.startswith("|--") and not stripped.startswith(("| ID |", "~~| ID |")):
            refactored = refactor_epics_row(line + "\n").rstrip("\n")
            out.append(refactored)
            continue

        # Section transitions: blank line / heading exits the table state
        if not stripped or stripped.startswith("#"):
            in_items = False
            in_epics = False

        out.append(line)

    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description="Refactor + backfill BACKLOG.md")
    parser.add_argument("--dry-run", action="store_true", help="don't write the file")
    parser.add_argument(
        "--miss-file",
        default=str(DEFAULT_MISS_FILE),
        help="where to write the backfill-miss list (default: specs/242-backlog-navigator/evidence/backfill-misses.txt)",
    )
    args = parser.parse_args()

    if not BACKLOG_PATH.exists():
        print(f"Cannot find {BACKLOG_PATH}", file=sys.stderr)
        return 1

    text = BACKLOG_PATH.read_text(encoding="utf-8")
    misses: list[str] = []
    new_text = refactor(text, misses)

    miss_path = Path(args.miss_file)
    miss_path.parent.mkdir(parents=True, exist_ok=True)
    miss_path.write_text("\n".join(misses) + ("\n" if misses else ""), encoding="utf-8")

    if args.dry_run:
        print(new_text)
        print(f"-- {len(misses)} backfill misses (not written)", file=sys.stderr)
        return 0

    BACKLOG_PATH.write_text(new_text, encoding="utf-8")
    print(
        f"Refactored {BACKLOG_PATH}; {len(misses)} rows fell back to sentinel {SENTINEL}.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
