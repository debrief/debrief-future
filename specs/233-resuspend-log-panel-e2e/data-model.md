# Data Model: Re-activate Log Panel E2E Suite

**Feature**: 233-resuspend-log-panel-e2e
**Date**: 2026-04-27

This feature has no runtime data model — it is a tests-and-lint-gate restoration. The "entities" below are the *configuration-state* objects whose transitions define done.

---

## Entities

### 1. Log Panel E2E Suite (`tests/e2e/test-log-panel.spec.ts`)

The Playwright spec file containing the five log-panel test cases.

| Field | Pre-state (now) | Post-state (after this feature) |
|-------|-----------------|----------------------------------|
| `describe` block wrapper | `test.describe.fixme('Log Panel', ...)` | `test.describe('Log Panel', ...)` |
| Mute comment block (lines 11–18) | Present (`// #233 — Re-suspended pending #142 ...`) | Removed |
| Test count | 5 cases (all skipped — `.fixme`) | 5 cases (all active) |
| File line count | 110 lines | ~98 lines (~12 line drop from comment + flag removal) |
| Test bodies (lines 21–109) | Unchanged | Unchanged — explicitly out of scope (spec §131) |

**Validation rule**: After the edit, `grep -nE '^\s*test(\.describe)?\.(skip|fixme)\s*\(' tests/e2e/test-log-panel.spec.ts` MUST emit zero matches. The skip-guard script encodes this as a CI-failable assertion.

### 2. Skip-guard Script (`scripts/check-log-panel-skip-guard.sh`)

The bash script #210 introduced and #534 deleted.

| Field | Pre-state (now) | Post-state (after this feature) |
|-------|-----------------|----------------------------------|
| File existence | Absent (deleted by #534) | Present (~41 lines, restored from `git show 5385f6e8:scripts/check-log-panel-skip-guard.sh`) |
| Mode | N/A | `0644` (matches sibling `check-*.sh` scripts) |
| Invoked from | N/A | `Taskfile.yml` `lint:` task |
| Exit on clean | N/A | `0` with `✅ Log-panel skip-guard passed (...)` |
| Exit on violation | N/A | `1` with `❌ Log-panel skip-guard failed!` + offending lines |

**Validation rule**: `bash scripts/check-log-panel-skip-guard.sh` exits `0` against the post-state of Entity 1.

### 3. Lint Task Wiring (`Taskfile.yml`)

The `lint:` task that orchestrates lint-time checks.

| Field | Pre-state (now) | Post-state (after this feature) |
|-------|-----------------|----------------------------------|
| Skip-guard invocation under `lint:` cmds | Absent (replaced by 6-line explanatory comment block, lines 115–120) | Present: `bash scripts/check-log-panel-skip-guard.sh` (single line, immediately after `bash scripts/check-adr-refs.sh`) |
| Mute-explanation comment (lines 115–120) | Present | Removed |
| Other `lint:` steps | Unchanged | Unchanged |

**Validation rule**: `task lint` exits `0` after the post-state edits.

### 4. Backlog Row 233 (`BACKLOG.md`)

The single row in the backlog table for item 233.

| Field | Pre-state (now) | Post-state (after this feature) |
|-------|-----------------|----------------------------------|
| Status column | `blocked` | `complete` |
| Strike-through | None | All cells in the row wrapped in `~~...~~` |
| Row position | Same | Same — order is preserved; we don't move it |

**Validation rule**: The post-state row matches the pattern `| ~~233~~ | ... | ~~complete~~ |` (markdown strike-through on every cell, per the existing convention used for #142, #143, #228, #230).

---

## State Transitions

```text
                                                  [#142 merged to main]
                                                            │
                                                            ▼
        ┌──────────────────────────────────────────────────────────────────────────┐
        │  PRE-STATE (current, post-#534)                                          │
        │  • Suite muted (test.describe.fixme)                                     │
        │  • Skip-guard absent (script deleted, Taskfile invocation absent)        │
        │  • BACKLOG row 233 = blocked                                             │
        └──────────────────────────────────────────────────────────────────────────┘
                                                            │
                                       (atomic commit — Decision 2 in research.md)
                                                            │
                                                            ▼
        ┌──────────────────────────────────────────────────────────────────────────┐
        │  POST-STATE (after this feature merges)                                  │
        │  • Suite active (test.describe), 5 cases passing                         │
        │  • Skip-guard restored, invoked from Taskfile lint task                  │
        │  • BACKLOG row 233 = ~~complete~~ (struck-through)                       │
        └──────────────────────────────────────────────────────────────────────────┘
                                                            │
                                          (verified by 3× CI re-run on the PR)
                                                            │
                                                            ▼
                                                    [merge to main]
```

There is exactly one transition. There is no rollback path defined inside this feature — if the suite re-flakes after merge, the spec's *Edge Cases* section directs the resolver to either narrow-mute the failing tests (`test.fixme` per case) or open a fresh focused spec, *not* to revert this feature.

---

## Relationships

```text
Backlog Row 233 ─── tracks ───▶ Spec 233 ─── un-suspends ───▶ Log Panel E2E Suite
                                    │                                  ▲
                                    │ requires                         │ guarded by
                                    ▼                                  │
                              Skip-guard Script ◀── invoked from ── Taskfile.yml (lint)
```

All four entities transition in one atomic commit. None of them has independent state once the commit lands — they form a single composed configuration.
