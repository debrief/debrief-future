"""Foundation tests: ledger load/validate/save round-trip (T010, T011)."""

from __future__ import annotations

import copy
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest
import yaml

FIXTURES = Path(__file__).resolve().parent / "fixtures"
VALID_LEDGER = FIXTURES / "valid-ledger.yaml"


def _valid_doc() -> dict[str, Any]:
    with VALID_LEDGER.open(encoding="utf-8") as handle:
        doc: dict[str, Any] = yaml.safe_load(handle)
    return doc


def test_load_accepts_valid_fixture(rl: ModuleType) -> None:
    ledger = rl.load(VALID_LEDGER)
    assert ledger.version == 1
    assert ledger.next_id == 4
    assert [f.id for f in ledger.findings] == ["RR-001", "RR-002", "RR-003"]
    assert ledger.by_id("RR-001").identity() == (
        "correctness",
        "shared/stac-writer",
        "relisted-boundary-type",
    )


def test_round_trip_preserves_document(rl: ModuleType, tmp_path: Path) -> None:
    ledger = rl.load(VALID_LEDGER)
    out = tmp_path / "ledger.yaml"
    rl.save(ledger, out)
    reloaded = rl.load(out)
    assert rl.to_document(ledger) == rl.to_document(reloaded)


def test_save_normalises_ordering(rl: ModuleType, tmp_path: Path) -> None:
    ledger = rl.load(VALID_LEDGER)
    ledger.findings.reverse()  # perturb order
    out = tmp_path / "ledger.yaml"
    rl.save(ledger, out)
    reloaded = rl.load(out)
    assert [f.id for f in reloaded.findings] == ["RR-001", "RR-002", "RR-003"]


def test_missing_file_is_empty_ledger(rl: ModuleType, tmp_path: Path) -> None:
    ledger = rl.load(tmp_path / "does-not-exist.yaml")
    assert ledger.findings == []
    assert ledger.next_id == 1


def _write(tmp_path: Path, doc: dict[str, Any]) -> Path:
    path = tmp_path / "ledger.yaml"
    with path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(doc, handle)
    return path


def test_rejects_bad_id_pattern(rl: ModuleType, tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["findings"][0]["id"] = "R-1"
    with pytest.raises(rl.LedgerCorruptError):
        rl.load(_write(tmp_path, doc))


def test_rejects_unknown_enum(rl: ModuleType, tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["findings"][0]["severity"] = "catastrophic"
    with pytest.raises(rl.LedgerCorruptError):
        rl.load(_write(tmp_path, doc))


def test_rejects_accepted_risk_without_reason(rl: ModuleType, tmp_path: Path) -> None:
    doc = _valid_doc()
    entry = copy.deepcopy(doc["findings"][1])  # RR-002 accepted-risk
    del entry["status_reason"]
    doc["findings"][1] = entry
    with pytest.raises(rl.LedgerCorruptError):
        rl.load(_write(tmp_path, doc))


def test_rejects_unknown_version(rl: ModuleType, tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["version"] = 2
    with pytest.raises(rl.LedgerCorruptError):
        rl.load(_write(tmp_path, doc))


def test_rejects_additional_property(rl: ModuleType, tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["findings"][0]["surprise"] = "unexpected"
    with pytest.raises(rl.LedgerCorruptError):
        rl.load(_write(tmp_path, doc))


def test_rejects_non_github_fix_pr(rl: ModuleType, tmp_path: Path) -> None:
    doc = _valid_doc()
    doc["findings"][2]["fix_pr"] = "https://example.com/pr/1"
    with pytest.raises(rl.LedgerCorruptError):
        rl.load(_write(tmp_path, doc))
