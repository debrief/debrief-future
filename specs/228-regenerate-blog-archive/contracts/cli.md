# Contract: `scripts/regenerate-blog-archive.py` CLI

**Status**: Authoritative. This is the only user-facing interface for feature 228. No HTTP, no MCP, no library surface — it is a one-shot script (FR-009). The contract below is what the PR reviewer, the website maintainer, and any future reader of the merged PR will rely on to understand what was run.

---

## Invocation

```text
python scripts/regenerate-blog-archive.py [--dry-run] [--verbose] [--out-index PATH]
                                          [--composite-window-days INT]
                                          [--near-miss-max-days INT]
                                          [--skip-gh]
                                          [--fail-fast]
```

All options are optional. Defaults are defined to make `python scripts/regenerate-blog-archive.py` the normal "do the run" command.

---

## Arguments

| Argument | Type | Default | Purpose |
|----------|------|---------|---------|
| `--dry-run` | flag | False | Perform full classification and staging but do NOT promote files from the temp dir. Prints the would-be index to stdout. Used for tuning thresholds and for CI smoke tests. |
| `--verbose` | flag | False | Emit per-spec classification decisions to stderr. |
| `--out-index PATH` | path | `ARCHIVE-REBUILD.md` (repo root) | Override the index destination. Primarily for test fixtures; the real run leaves this at the default. |
| `--composite-window-days INT` | int | `5` | Upper bound (inclusive) on composite-cluster ship-date span. Matches FR-003 default. Configurable for dry-run tuning. |
| `--near-miss-max-days INT` | int | `10` | Upper bound (inclusive) on "near miss" Δdays. Pairs above `--composite-window-days` and ≤ this value are listed in Unresolved Groupings. |
| `--skip-gh` | flag | False | Skip all `gh` calls (forces PR-description fallback). Useful for air-gapped runs. |
| `--fail-fast` | flag | False | Exit non-zero on the first per-spec parse error. Default behaviour instead logs the failure, marks the spec as Unresolved, and continues. |

**Constraints**:
- `--composite-window-days` MUST be ≥ 1 and ≤ `--near-miss-max-days`.
- `--near-miss-max-days` MUST be ≥ `--composite-window-days`.
- `--out-index` MUST NOT resolve to an existing file unless the file is `ARCHIVE-REBUILD.md` itself (the script overwrites its own index from a previous run; it never overwrites arbitrary files).

Any constraint violation → exit code **2** with an explanation on stderr before any filesystem work begins.

---

## Exit codes

| Code | Meaning |
|------|---------|
| **0** | Run completed; all expected files staged and promoted (or, with `--dry-run`, all files staged). `ARCHIVE-REBUILD.md` is up to date. |
| **1** | Run failed during classification or staging. Temp directory removed. `specs/` and `ARCHIVE-REBUILD.md` unchanged from the starting state. Stderr names the offending spec and the underlying error. |
| **2** | Argument validation failure (see constraints above). No filesystem work performed. |
| **3** | Atomic promotion failed mid-way (rare — a `shutil.move` raised after some files had already moved). Script attempts best-effort reverse-move; stderr lists every file that did and didn't make it back. **This is the one case where the working tree may be left partial** and the runbook tells the reviewer to inspect `git status`. |

Exit codes 1 and 2 guarantee zero mutation. Exit code 3 is the degenerate case callers must be ready for (extremely unlikely in practice: same filesystem, pre-validated destinations, but we document it for honesty).

---

## Stdout contract

On a successful run (exit 0), stdout is a single summary block suitable for copy-paste into the PR description:

```text
Archive Rebuild Summary — 2026-04-23T14:05:12Z
  Scanned:              155 spec directories
  Shipped (eligible):   118
  Unified posts:         91
  Epic rollups:           5  (E02, E05, E08, E11 active, E04)
  Composite posts:        3  (6 member specs)
  Skipped (in-flight):   37
  Unresolved groupings: 11  (see ARCHIVE-REBUILD.md)
  Run duration:        42.6s
  GitHub API:            reachable (gh 2.55.0)
Index written: /repo/ARCHIVE-REBUILD.md
```

In `--dry-run` mode, prepend `[DRY-RUN] ` and write `Index would-be written at: ...` instead of `Index written: ...`.

---

## Stderr contract

- `--verbose`: one line per spec, format `classify NNN-slug -> category (reason)`.
- Warnings (non-fatal): prefixed `warning:`.
- Errors (exit 1/2/3): prefixed `error:` and include the spec path.
- No secrets or PII ever written to stderr (there are none in the domain, but the logger has an allowlist just in case).

---

## Filesystem side effects

**Writes** (on successful run):
- `ARCHIVE-REBUILD.md` — overwritten at repo root (single index file).
- `specs/NNN-<slug>/media/unified-post.md` — new files only, never existing paths.
- `specs/<lowest-NNN-member>/media/epic-rollup.md` — one per complete epic.
- `specs/<lowest-NNN-anchor>/media/composite-post.md` — one per composite cluster.

**Never touches**:
- Any existing file under `specs/*/` (FR-007 hard guard; an attempt is an error).
- `CLAUDE.md`, `BACKLOG.md`, `docs/`, `apps/`, `services/`, schemas — read-only for all.
- `.git/` — the script does not call git commands (promotion uses `shutil`, not `git add`).

**Staging area**: `tempfile.mkdtemp(prefix="archive-rebuild-")` under the system temp dir. Removed on both success (after promotion) and failure (before exit).

---

## Dependencies and environment

| Dependency | Required? | Notes |
|------------|-----------|-------|
| Python | ≥ 3.11 | Matches repo baseline. |
| PyYAML | required | Already present via `uv.lock`. |
| `gh` CLI | optional | Graceful fallback when absent; `--skip-gh` forces fallback for air-gapped runs. |
| Network | optional | Required ONLY if `gh` is present and `--skip-gh` not set. Script is offline-safe. |
| Git | not used | Read-only metadata via `git log` only in the date-fallback path (R2 tier 3). |

---

## Observability

The script emits a single structured log file at `<temp-dir>/run.log` during the run (captured into the temp area so it is discarded on failure). On success, this file's contents are appended to the bottom of `ARCHIVE-REBUILD.md` under a `<details>` block titled "Run log (raw)" so the PR reviewer can inspect per-spec decisions without re-running.

---

## Contract test checklist

Each row maps to a test that MUST exist before the script is merged (Constitution VI.2 / VII). Tests live in `tests/regenerate_blog_archive/`.

| # | Contract point | Test file |
|---|----------------|-----------|
| C1 | `--dry-run` performs classification without promoting files | `test_atomic_writer.py::test_dry_run_no_writes` |
| C2 | Exit 2 on invalid `--composite-window-days` (0 or negative) | `test_cli_args.py::test_invalid_window` |
| C3 | Exit 2 on `--out-index` that resolves to an existing arbitrary file | `test_cli_args.py::test_out_index_guard` |
| C4 | Exit 1 on per-spec parse error with `--fail-fast`, exit 0 otherwise | `test_classify.py::test_fail_fast_vs_continue` |
| C5 | Zero existing files mutated (verified by comparing sha256 of all `specs/*/` files before/after) | `test_stitch.py::test_no_overwrites` |
| C6 | `--skip-gh` forces `pr-body=shipped-post` for every spec | `test_pr_body.py::test_skip_gh_forces_fallback` |
| C7 | Every generated file appears as one row in the emitted index | `test_index.py::test_index_row_per_post` |
| C8 | Near-miss pair at Δdays=7 with shared tag → one entry under "Unresolved Groupings → Near Misses" | `test_composite_pairs.py::test_near_miss_seven_days` |
| C9 | Composite cluster with date span = 5 days → single composite (boundary inclusive) | `test_composite_pairs.py::test_boundary_five_days` |
| C10 | Epic rollup at `specs/<lowest-NNN-member>/media/epic-rollup.md` | `test_epic_charter.py::test_rollup_anchor_is_lowest_nnn` |

SC-001 is observationally checked by C7 + a smoke assertion that every `SpecRecord` ends up in exactly one of: a row as a generated post, an epic-rollup member list, a composite-cluster member list, or the Skipped sub-section.
