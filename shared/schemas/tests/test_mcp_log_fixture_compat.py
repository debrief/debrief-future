"""
FR-011 — Log-replay fixture compatibility test for the MCP cluster (#222).

Loads every JSON file under services/session-state/**/__fixtures__/
matching `*tool*log*.json` / `*replay*.json` and validates it against
the generated `ToolResultForLog` Pydantic class.

The principle: the schema must be additive over the union of all
currently-shipped log shapes. If a fixture fails, widen the LinkML
model — never edit the fixture.

When no such fixtures exist (clean checkout) this test is effectively
a placeholder that emits a SKIP marker but exercises the discovery
machinery so future fixtures land under coverage automatically.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))

from debrief_schemas import ToolResultForLog  # noqa: E402

REPO_ROOT = Path(__file__).parent.parent.parent.parent
SESSION_STATE_ROOT = REPO_ROOT / "services" / "session-state"

PATTERNS = ("*tool*log*.json", "*replay*.json")


def _discover_log_fixtures() -> list[tuple[str, Path]]:
    """Walk services/session-state/**/__fixtures__/ for tool-log / replay fixtures."""
    hits: list[tuple[str, Path]] = []
    if not SESSION_STATE_ROOT.exists():
        return hits
    for fixtures_dir in SESSION_STATE_ROOT.rglob("__fixtures__"):
        if not fixtures_dir.is_dir():
            continue
        for pattern in PATTERNS:
            for fixture in fixtures_dir.rglob(pattern):
                rel = fixture.relative_to(REPO_ROOT)
                hits.append((str(rel), fixture))
    return hits


LOG_FIXTURES = _discover_log_fixtures()


@pytest.mark.skipif(
    not LOG_FIXTURES,
    reason=(
        "No tool-log / replay fixtures discovered under "
        "services/session-state/**/__fixtures__/. "
        "Test re-activates automatically when fixtures land."
    ),
)
@pytest.mark.parametrize(
    "name,fixture",
    LOG_FIXTURES,
    ids=[c[0] for c in LOG_FIXTURES],
)
def test_log_fixture_validates_against_tool_result_for_log(name: str, fixture: Path) -> None:
    """Every committed log fixture must validate against the generated class.

    FR-011: the schema widens to accept fixtures; fixtures are never
    rewritten. If this test fails, edit `shared/schemas/src/linkml/mcp.yaml`
    to add the missing slot, not the fixture.
    """
    raw = json.loads(fixture.read_text())
    # Some fixture files are wrapper objects; if the file contains a list,
    # validate each entry that looks like a tool-log payload.
    payloads = raw if isinstance(raw, list) else [raw]
    for i, payload in enumerate(payloads):
        if not isinstance(payload, dict):
            continue
        # Heuristic: only attempt validation on objects that look like
        # tool-result-for-log payloads (`success` + `duration_ms`).
        if "success" in payload and "duration_ms" in payload:
            try:
                ToolResultForLog.model_validate(payload)
            except Exception as exc:  # noqa: BLE001
                pytest.fail(
                    f"{name}[{i}]: ToolResultForLog rejected the fixture — "
                    f"widen shared/schemas/src/linkml/mcp.yaml to accept it. "
                    f"Pydantic error: {exc}"
                )
