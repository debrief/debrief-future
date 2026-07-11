#!/usr/bin/env python3
"""Typed helper for the /repo-review findings ledger (spec 282).

The ledger (``docs/project_notes/reviews/ledger.yaml``) is the single source of
truth for finding status across review runs. Every programmatic write goes
through this helper so that the same JSON-Schema gate applies to skill writes
and hand edits alike; a corrupt ledger halts rather than being silently
regenerated (FR-008).

Subcommands
-----------
``validate``
    Load + schema-validate the ledger. Exit 0 valid, exit 1 with the schema
    error path.

``reconcile``
    Match a run's confirmed findings against the ledger by defect identity
    (dimension + module_path + defect_slug), refresh line numbers on matches,
    assign fresh RR-NNN ids to genuinely new findings, and mark ledger entries
    whose defect has disappeared as ``fixed`` (R-003, FR-009). Stage-2 fuzzy
    pairings (file moves/renames) are supplied by the synthesis agent via
    ``--pairings``; without them the command prints the unmatched sets for the
    agent to decide, and does not write.

``record-fix-pr``
    Attach a fix PR url to an ``open`` entry (FR-016). Status stays ``open``;
    only a later reconcile that observes the defect gone flips it to ``fixed``.

Usage
-----
::

    python scripts/review-ledger.py validate [--ledger PATH]
    python scripts/review-ledger.py reconcile --run-findings F.json \\
        --date YYYY-MM-DD --sha <40hex> [--pairings P.json] [--write]
    python scripts/review-ledger.py record-fix-pr RR-014 <pr-url> [--ledger PATH]

Exit codes
----------
0  Success (valid / reconciled / recorded).
1  Ledger corrupt or a precondition failed (unknown id, non-open status, ...).
2  Bad invocation (missing/unreadable input file).
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEDGER = REPO_ROOT / "docs/project_notes/reviews/ledger.yaml"
SCHEMA_PATH = REPO_ROOT / ".claude/review/ledger.schema.json"

RESOLVED_STATUSES = frozenset({"fixed", "accepted-risk"})


class LedgerError(Exception):
    """Base class for ledger operations that must halt the caller."""


class LedgerCorruptError(LedgerError):
    """The ledger failed schema validation and must not be auto-regenerated."""


class PreconditionError(LedgerError):
    """A subcommand precondition failed (unknown id, wrong status, ...)."""


# --------------------------------------------------------------------------- #
# Typed model (data-model.md). yaml.safe_load returns Any; we narrow here.
# --------------------------------------------------------------------------- #


@dataclass
class RunRef:
    date: str
    git_sha: str


@dataclass
class Location:
    file: str
    line: int


@dataclass
class LedgerEntry:
    id: str
    status: str
    dimension: str
    severity: str
    effort: str
    title: str
    failure_scenario: str
    locations: list[Location]
    module_path: str
    defect_slug: str
    heuristic: str
    verification: str
    first_seen: RunRef
    last_seen: RunRef
    status_reason: str | None = None
    theme: str | None = None
    fix_pr: str | None = None

    def identity(self) -> tuple[str, str, str]:
        """Defect identity used for stage-1 mechanical matching (R-003)."""
        return (self.dimension, self.module_path, self.defect_slug)


@dataclass
class Ledger:
    version: int = 1
    next_id: int = 1
    findings: list[LedgerEntry] = field(default_factory=list)

    def by_id(self, finding_id: str) -> LedgerEntry | None:
        return next((f for f in self.findings if f.id == finding_id), None)


# --------------------------------------------------------------------------- #
# (De)serialisation
# --------------------------------------------------------------------------- #


def _load_schema() -> dict[str, Any]:
    with SCHEMA_PATH.open(encoding="utf-8") as handle:
        schema: dict[str, Any] = json.load(handle)
    return schema


def _validate_raw(raw: object) -> dict[str, Any]:
    """Schema-validate the raw parsed document; raise on the first error."""
    validator = Draft202012Validator(_load_schema())
    errors = sorted(validator.iter_errors(raw), key=lambda e: list(e.absolute_path))
    if errors:
        first = errors[0]
        location = "/".join(str(p) for p in first.absolute_path) or "<root>"
        raise LedgerCorruptError(f"{location}: {first.message}")
    assert isinstance(raw, dict)
    return raw


def _entry_from_dict(data: dict[str, Any]) -> LedgerEntry:
    return LedgerEntry(
        id=data["id"],
        status=data["status"],
        dimension=data["dimension"],
        severity=data["severity"],
        effort=data["effort"],
        title=data["title"],
        failure_scenario=data["failure_scenario"],
        locations=[Location(file=loc["file"], line=loc["line"]) for loc in data["locations"]],
        module_path=data["module_path"],
        defect_slug=data["defect_slug"],
        heuristic=data["heuristic"],
        verification=data["verification"],
        first_seen=RunRef(**data["first_seen"]),
        last_seen=RunRef(**data["last_seen"]),
        status_reason=data.get("status_reason"),
        theme=data.get("theme"),
        fix_pr=data.get("fix_pr"),
    )


def load(path: Path = DEFAULT_LEDGER) -> Ledger:
    """Read, schema-validate, and narrow a ledger file. Missing file → empty ledger."""
    if not path.exists():
        return Ledger()
    with path.open(encoding="utf-8") as handle:
        raw = yaml.safe_load(handle)
    if raw is None:
        return Ledger()
    validated = _validate_raw(raw)
    return Ledger(
        version=validated["version"],
        next_id=validated["next_id"],
        findings=[_entry_from_dict(e) for e in validated["findings"]],
    )


def _entry_to_dict(entry: LedgerEntry) -> dict[str, Any]:
    """Serialise an entry, dropping None-valued optional fields for clean YAML."""
    data = asdict(entry)
    return {key: value for key, value in data.items() if value is not None}


def to_document(ledger: Ledger) -> dict[str, Any]:
    ordered = sorted(ledger.findings, key=lambda e: e.id)
    return {
        "version": ledger.version,
        "next_id": ledger.next_id,
        "findings": [_entry_to_dict(e) for e in ordered],
    }


def save(ledger: Ledger, path: Path = DEFAULT_LEDGER) -> None:
    """Validate the whole document, then atomically write it (R-008)."""
    document = to_document(ledger)
    _validate_raw(document)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(document, handle, sort_keys=False, allow_unicode=True)
    tmp.replace(path)


# --------------------------------------------------------------------------- #
# Reconciliation (R-003, FR-009)
# --------------------------------------------------------------------------- #


@dataclass
class Candidate:
    """A confirmed finding from a review run, pre-reconciliation."""

    dimension: str
    module_path: str
    defect_slug: str
    severity: str
    effort: str
    title: str
    failure_scenario: str
    locations: list[Location]
    heuristic: str
    verification: str
    theme: str | None = None

    def identity(self) -> tuple[str, str, str]:
        return (self.dimension, self.module_path, self.defect_slug)


def candidate_from_dict(data: dict[str, Any]) -> Candidate:
    return Candidate(
        dimension=data["dimension"],
        module_path=data["module_path"],
        defect_slug=data["defect_slug"],
        severity=data["severity"],
        effort=data["effort"],
        title=data["title"],
        failure_scenario=data["failure_scenario"],
        locations=[Location(file=loc["file"], line=loc["line"]) for loc in data["locations"]],
        heuristic=data["heuristic"],
        verification=data["verification"],
        theme=data.get("theme"),
    )


@dataclass
class ReconcileResult:
    matched: list[str] = field(default_factory=list)          # ledger ids re-confirmed
    newly_fixed: list[str] = field(default_factory=list)      # ledger ids transitioned to fixed
    assigned: dict[int, str] = field(default_factory=dict)    # candidate index -> new id
    unmatched_candidates: list[int] = field(default_factory=list)   # indices needing stage-2
    unmatched_open_entries: list[str] = field(default_factory=list)  # ids needing stage-2


def _refresh_entry(entry: LedgerEntry, cand: Candidate, run: RunRef) -> None:
    """A re-detected defect: refresh volatile fields, preserve id + status + history."""
    entry.locations = cand.locations
    entry.severity = cand.severity
    entry.effort = cand.effort
    entry.title = cand.title
    entry.failure_scenario = cand.failure_scenario
    entry.verification = cand.verification
    entry.heuristic = cand.heuristic
    entry.theme = cand.theme
    entry.last_seen = run


def reconcile(
    ledger: Ledger,
    candidates: list[Candidate],
    run: RunRef,
    pairings: dict[int, str] | None = None,
) -> ReconcileResult:
    """Match candidates to ledger entries and mutate ``ledger`` in place.

    Stage 1 is a deterministic identity match. ``pairings`` (candidate index →
    ledger id) supplies the agent's stage-2 decisions for moved/renamed defects.
    Entries left unmatched after both stages: ``open`` entries whose defect has
    disappeared transition to ``fixed``; ``accepted-risk`` entries are left
    untouched (honours hand edits — T027). Genuinely new candidates get fresh
    ids. Entries and candidates still unmatched with no pairing are reported for
    a (further) stage-2 pass rather than force-matched.
    """
    pairings = pairings or {}
    result = ReconcileResult()

    entries_by_identity: dict[tuple[str, str, str], LedgerEntry] = {}
    for entry in ledger.findings:
        entries_by_identity.setdefault(entry.identity(), entry)

    matched_entry_ids: set[str] = set()

    # Stage 1: mechanical identity match.
    unmatched_indices: list[int] = []
    for index, cand in enumerate(candidates):
        entry = entries_by_identity.get(cand.identity())
        if entry is not None:
            _refresh_entry(entry, cand, run)
            matched_entry_ids.add(entry.id)
            result.matched.append(entry.id)
        else:
            unmatched_indices.append(index)

    # Stage 2: apply agent-supplied pairings for the residue.
    still_unmatched: list[int] = []
    for index in unmatched_indices:
        paired_id = pairings.get(index)
        if paired_id is not None:
            entry = ledger.by_id(paired_id)
            if entry is None:
                raise PreconditionError(f"pairing references unknown id {paired_id}")
            cand = candidates[index]
            # A move/rename updates identity fields too.
            entry.module_path = cand.module_path
            entry.defect_slug = cand.defect_slug
            _refresh_entry(entry, cand, run)
            matched_entry_ids.add(entry.id)
            result.matched.append(entry.id)
        else:
            still_unmatched.append(index)

    # Remaining candidates with an explicit new-id request are assigned; with no
    # pairing at all they are reported for a further stage-2 decision.
    for index in still_unmatched:
        if index in pairings and pairings[index] == "":  # explicit "this is new"
            new_id = _assign_new(ledger, candidates[index], run)
            result.assigned[index] = new_id
        elif not pairings:
            result.unmatched_candidates.append(index)
        else:
            # pairings were supplied but omitted this index → treat as new.
            new_id = _assign_new(ledger, candidates[index], run)
            result.assigned[index] = new_id

    # Open entries whose defect disappeared → fixed. accepted-risk left as-is.
    for entry in ledger.findings:
        if entry.id in matched_entry_ids:
            continue
        if entry.status == "open":
            if not pairings:
                result.unmatched_open_entries.append(entry.id)
            else:
                entry.status = "fixed"
                entry.last_seen = run
                result.newly_fixed.append(entry.id)

    return result


def _assign_new(ledger: Ledger, cand: Candidate, run: RunRef) -> str:
    new_id = f"RR-{ledger.next_id:03d}"
    ledger.next_id += 1
    ledger.findings.append(
        LedgerEntry(
            id=new_id,
            status="open",
            dimension=cand.dimension,
            severity=cand.severity,
            effort=cand.effort,
            title=cand.title,
            failure_scenario=cand.failure_scenario,
            locations=cand.locations,
            module_path=cand.module_path,
            defect_slug=cand.defect_slug,
            heuristic=cand.heuristic,
            verification=cand.verification,
            first_seen=run,
            last_seen=run,
            theme=cand.theme,
        )
    )
    return new_id


def tuning_recommendation(heuristic: str, confirmed: int, refuted: int) -> str:
    """Deterministic playbook-tuning recommendation from attribution counts (FR-019, R-004).

    - ``add``       — recurring unprompted finds (a defect class no heuristic named).
    - ``prune``     — a heuristic that produced candidates but confirmed none.
    - ``strengthen``— a high-yield heuristic (>= 3 confirmed and majority confirmed).
    - ``keep``      — everything else.
    """
    candidates = confirmed + refuted
    if heuristic == "(unprompted)":
        return "add" if confirmed >= 2 else "keep"
    if candidates == 0:
        return "keep"
    if confirmed == 0:
        return "prune"
    if confirmed >= 3 and confirmed * 2 >= candidates:
        return "strengthen"
    return "keep"


def record_fix_pr(ledger: Ledger, finding_id: str, pr_url: str) -> None:
    """Attach a fix PR to an open entry (FR-016). Raises on unknown/non-open id."""
    entry = ledger.by_id(finding_id)
    if entry is None:
        raise PreconditionError(f"{finding_id} not found in ledger")
    if entry.status != "open":
        raise PreconditionError(
            f"{finding_id} is '{entry.status}', not 'open'"
            + (f" ({entry.status_reason})" if entry.status_reason else "")
        )
    entry.fix_pr = pr_url


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def _cmd_validate(args: argparse.Namespace) -> int:
    try:
        load(args.ledger)
    except LedgerCorruptError as exc:
        print(f"INVALID: {exc}", file=sys.stderr)
        return 1
    print(f"OK: {args.ledger} is valid")
    return 0


def _read_json(path: Path) -> Any:
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"cannot read {path}: {exc}") from exc


def _cmd_reconcile(args: argparse.Namespace) -> int:
    ledger = load(args.ledger)
    raw_findings = _read_json(args.run_findings)
    candidates = [candidate_from_dict(item) for item in raw_findings]
    run = RunRef(date=args.date, git_sha=args.sha)
    pairings: dict[int, str] | None = None
    if args.pairings is not None:
        raw_pairings = _read_json(args.pairings)
        pairings = {int(k): str(v) for k, v in raw_pairings.items()}

    result = reconcile(ledger, candidates, run, pairings)
    if args.write:
        save(ledger, args.ledger)
    print(json.dumps(asdict(result), indent=2))
    return 0


def _cmd_record_fix_pr(args: argparse.Namespace) -> int:
    ledger = load(args.ledger)
    try:
        record_fix_pr(ledger, args.finding_id, args.pr_url)
    except PreconditionError as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        return 1
    save(ledger, args.ledger)
    print(f"OK: recorded {args.pr_url} on {args.finding_id}")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="review-ledger", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_validate = sub.add_parser("validate", help="schema-validate the ledger")
    p_validate.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    p_validate.set_defaults(func=_cmd_validate)

    p_reconcile = sub.add_parser("reconcile", help="match run findings against the ledger")
    p_reconcile.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    p_reconcile.add_argument("--run-findings", type=Path, required=True)
    p_reconcile.add_argument("--date", required=True)
    p_reconcile.add_argument("--sha", required=True)
    p_reconcile.add_argument("--pairings", type=Path, default=None)
    p_reconcile.add_argument("--write", action="store_true")
    p_reconcile.set_defaults(func=_cmd_reconcile)

    p_fix = sub.add_parser("record-fix-pr", help="attach a fix PR to an open finding")
    p_fix.add_argument("finding_id")
    p_fix.add_argument("pr_url")
    p_fix.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    p_fix.set_defaults(func=_cmd_record_fix_pr)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    func: Any = args.func
    return int(func(args))


if __name__ == "__main__":
    raise SystemExit(main())
