"""Reconciliation + record-fix-pr tests (T025, T026, T027, T030)."""

from __future__ import annotations

from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

FIXTURES = Path(__file__).resolve().parent / "fixtures"
VALID_LEDGER = FIXTURES / "valid-ledger.yaml"

RUN = {"date": "2026-08-01", "git_sha": "a" * 40}


def _run_ref(rl: ModuleType) -> Any:
    return rl.RunRef(date=RUN["date"], git_sha=RUN["git_sha"])


def _candidate(rl: ModuleType, **overrides: Any) -> Any:
    base: dict[str, Any] = {
        "dimension": "correctness",
        "module_path": "shared/stac-writer",
        "defect_slug": "relisted-boundary-type",
        "severity": "high",
        "effort": "S",
        "title": "Save path drops features when the source type grows",
        "failure_scenario": "field added to source is dropped on reload",
        "locations": [rl.Location(file="shared/stac-writer/src/core.ts", line=150)],
        "heuristic": "CB-03",
        "verification": "reproduced by adding a field",
        "theme": "relisted-boundary-types",
    }
    base.update(overrides)
    return rl.Candidate(**base)


def test_exact_match_refreshes_lines(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    cand = _candidate(rl)  # same identity as RR-001, line moved 142 -> 150
    result = rl.reconcile(ledger, [cand], _run_ref(rl), pairings={})
    assert result.matched == ["RR-001"]
    assert ledger.by_id("RR-001").locations[0].line == 150
    assert ledger.by_id("RR-001").last_seen.date == "2026-08-01"
    assert ledger.by_id("RR-001").status == "open"


def test_disappeared_open_defect_becomes_fixed(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    # No candidate matches RR-001; supply a pairings dict (non-None) to finalise.
    other = _candidate(
        rl,
        module_path="services/calc",
        defect_slug="wrong-bearing",
        title="calc returns wrong bearing",
    )
    result = rl.reconcile(ledger, [other], _run_ref(rl), pairings={})
    assert "RR-001" in result.newly_fixed
    assert ledger.by_id("RR-001").status == "fixed"


def test_line_drift_still_matches(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    cand = _candidate(rl, locations=[rl.Location(file="shared/stac-writer/src/core.ts", line=999)])
    result = rl.reconcile(ledger, [cand], _run_ref(rl), pairings={})
    assert result.matched == ["RR-001"]


def test_new_defect_gets_new_id(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    cand = _candidate(
        rl,
        module_path="services/calc",
        defect_slug="wrong-bearing",
        title="calc returns wrong bearing",
    )
    result = rl.reconcile(ledger, [cand], _run_ref(rl), pairings={})
    assert result.assigned == {0: "RR-004"}
    assert ledger.next_id == 5
    assert ledger.by_id("RR-004").status == "open"
    assert ledger.by_id("RR-004").first_seen.date == "2026-08-01"


def test_accepted_risk_redetection_stays_suppressed(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    cand = _candidate(
        rl,
        dimension="correctness",
        module_path="services/io",
        defect_slug="dialect-b-trailing-cut",
        severity="medium",
        effort="M",
        title="Legacy REP dialect mangles trailing sensor cuts",
        heuristic="CB-07",
        theme=None,
    )
    result = rl.reconcile(ledger, [cand], _run_ref(rl), pairings={})
    assert "RR-002" in result.matched
    assert ledger.by_id("RR-002").status == "accepted-risk"
    assert ledger.by_id("RR-002").status_reason  # reason preserved


def test_accepted_risk_hand_edit_not_reopened_when_absent(rl: ModuleType) -> None:
    # RR-002 accepted-risk, no matching candidate this run: must stay accepted-risk (T027).
    ledger = rl.load(VALID_LEDGER)
    cand = _candidate(rl)  # matches RR-001 only
    rl.reconcile(ledger, [cand], _run_ref(rl), pairings={})
    assert ledger.by_id("RR-002").status == "accepted-risk"


def test_first_run_creates_ledger_from_rr001(rl: ModuleType, tmp_path: Path) -> None:
    empty = rl.load(tmp_path / "none.yaml")  # empty ledger
    cand = _candidate(rl)
    result = rl.reconcile(empty, [cand], _run_ref(rl), pairings={})
    assert result.assigned == {0: "RR-001"}
    assert empty.next_id == 2
    assert empty.by_id("RR-001").first_seen.date == "2026-08-01"


def test_stage_two_pairing_links_moved_defect(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    # RR-001 defect moved file+slug: mechanical match fails, agent pairs index 0 -> RR-001.
    moved = _candidate(
        rl,
        module_path="shared/stac-writer",
        defect_slug="relisted-dto-on-write",
        locations=[rl.Location(file="shared/stac-writer/src/write.ts", line=30)],
    )
    result = rl.reconcile(ledger, [moved], _run_ref(rl), pairings={0: "RR-001"})
    assert result.matched == ["RR-001"]
    assert ledger.by_id("RR-001").defect_slug == "relisted-dto-on-write"
    assert "RR-001" not in result.newly_fixed


def test_unpaired_dry_run_reports_unmatched(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    novel = _candidate(
        rl,
        module_path="apps/vscode",
        defect_slug="unawaited-save",
        title="unawaited save promise",
    )
    result = rl.reconcile(ledger, [novel], _run_ref(rl), pairings=None)
    assert result.unmatched_candidates == [0]
    assert "RR-001" in result.unmatched_open_entries
    assert result.assigned == {}  # dry run assigns nothing


def test_record_fix_pr_sets_url_leaves_open(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    rl.record_fix_pr(ledger, "RR-001", "https://github.com/debrief/debrief-future/pull/701")
    assert ledger.by_id("RR-001").fix_pr.endswith("/pull/701")
    assert ledger.by_id("RR-001").status == "open"


def test_record_fix_pr_rejects_unknown_id(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    with pytest.raises(rl.PreconditionError):
        rl.record_fix_pr(ledger, "RR-999", "https://github.com/debrief/debrief-future/pull/1")


def test_record_fix_pr_rejects_non_open(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    with pytest.raises(rl.PreconditionError):
        rl.record_fix_pr(ledger, "RR-002", "https://github.com/debrief/debrief-future/pull/1")
