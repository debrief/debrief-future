---
feature: "208-timeline-entry-kind"
captured_at: "2026-04-22T07:10:00Z"
git_sha: "2109f6f4"
tests_passed: 13
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Timeline Entry `kind` Discriminator

## Results

| Metric | Value |
|--------|-------|
| Total new tests for this feature | 13 |
| Passed | 13 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | Not re-measured — this feature touches 3 files whose existing lines stay covered by existing tests; 2 new test files cover the new code paths. |

## Test Breakdown

### New foundation suite — `shared/components/src/LogPanel/__tests__/timelineEntryKind.test.ts` (7 tests)

Covers T013, T014, T030 — the TimelineEntryKind contract surface.

| Test | Status |
|------|--------|
| `TIMELINE_ENTRY_KINDS` enumerates exactly `['snapshot', 'tool', 'tune']` in declared order | Pass |
| Each `TIMELINE_ENTRY_KINDS` element is assignable to `TimelineEntryKind` (satisfies + runtime check) | Pass |
| `assertNeverKind` is unreachable under an exhaustive switch | Pass |
| `assertNeverKind` throws at runtime if somehow reached | Pass |
| `TimelineEntry.kind` admits all three declared kinds without type error | Pass |
| `TimelineEntry.kind` admits an absent kind (optional field) | Pass |
| `TimelineEntry.kind` rejects invalid kinds at compile time (`@ts-expect-error`) | Pass |

### New host populator suite — `apps/vscode/tests/unit/logPanelView.test.ts` (6 tests)

Covers T020 — the `toTimelineEntry` kind populator per `contracts/timeline-entry-kind.contract.md`.

| Test | Status |
|------|--------|
| Maps a snapshot tool (`export-png`) to `kind: "snapshot"` | Pass |
| Maps another snapshot tool (`export-csv`) to `kind: "snapshot"` | Pass |
| Maps a non-snapshot tool (`bearing-between-tracks`) to `kind: "tool"` | Pass |
| Maps an unmapped tool to `kind: "tool"` (neutral-grey fallback) | Pass |
| Does NOT emit `kind: "tune"` even for an entry with a non-null tune annotation | Pass |
| Produces stable results under repeat invocation | Pass |

### Extended renderer suite — `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` (7 new cases; 14 total tests in the file)

Covers T021, T031 — the consumer switch-over and `'tune'` tolerance.

| Test | Status |
|------|--------|
| Renders snapshot presentation when `kind === "snapshot"` (regardless of toolName) | Pass |
| Renders tool presentation when `kind === "tool"` (regardless of toolName) | Pass |
| Falls back to legacy category check when `kind` is absent and toolName is a snapshot tool | Pass |
| Falls back to tool rendering when `kind` is absent and toolName is non-snapshot | Pass |
| Renders tool-row presentation for `kind === "tune"` without throwing (T031 future-tune compatibility) | Pass |
| Treats an unknown `kind` value as tool-row (FR-007 graceful fallback) | Pass |

## Key Scenarios Verified

- **FR-001 through FR-004, FR-006** — discriminator replaces the category-as-semantics shortcut. Verified by the renderer suite's `kind`-driven rendering assertions and by SC-003's grep evidence (see `code-search-evidence.md`).
- **FR-005** — contract admits `'tune'` but no populator emits it. Verified by the host populator's "does NOT emit kind: 'tune' for a tune-annotation entry" case, and by the renderer's "future 'tune' compatibility" describe block.
- **FR-007** — graceful fallback for absent or unknown `kind`. Verified by the two renderer fallback cases plus the "unknown kind" cast case.
- **FR-008** — no residual `ToolCategory === 'snapshot'` in LogPanel rendering code outside the gated legacy fallback. Verified by the grep-output evidence file.
- **FR-009** — exhaustiveness enforcement. Verified by the foundation suite's "unreachable under exhaustive switch" test — the test's own compile pass is the enforcement mechanism; widening the union without updating the switch would fail to compile at this test site.
- **SC-001** — zero visible regression. Verified by DOM-equivalence assertions in the renderer suite (see `visual-parity.md` for the full argument); the four "pre-change parity" fallback cases exercise the identical predicate used pre-change.
- **SC-002** — every emitted `TimelineEntry` has a defined `kind`. Verified by the host populator's six cases (each asserts `projected.kind` is one of the declared literals); `toTimelineEntry` returns a non-optional `kind` in its implementation.
- **SC-005** — interim populator decision table ≤ 10 lines and co-located. Verified structurally — the `classifyKind` helper in `logPanelView.ts` is 4 lines, including the signature and brace; the whole populator edit is ≤ 10 lines.

## Known Issues

- **Unrelated pre-existing failure**: `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts:244` ("T028: read-only filesystem throws `ReadOnlyFilesystemError`") fails in this cloud sandbox environment because `chmod 0o555` on the parent directory does not enforce when tests run as root in the container. This failure:
  - Is unrelated to feature 208 (touches `stacService`, not LogPanel).
  - Reproduces on `main` in the same sandbox (pre-existing).
  - Passes in standard developer environments with unprivileged user IDs.

  No mitigation added in this feature. The test itself is correct; the sandbox is the anomaly.

- **Storybook/Playwright visual screenshot NOT captured**: SC-001 verification uses DOM-equivalence in place of pixel-diff. Rationale is documented in `visual-parity.md`. A reviewer can capture the pixel-diff artefacts using the commands in that file if pixel-level assurance is wanted.

- **VS Code extension dev-mode smoke test (T041) NOT executed**: cloud session has no interactive display. The host populator is exercised through its unit tests; the webview renderer is exercised through its component tests. Pre-merge reviewer should run `F5` in their local VS Code and open a session with at least one `export-png` entry to confirm visual-parity against their local `main`.

## Environment

- Runner: vitest 1.6.1
- Branch: `208-timeline-entry-kind`
- Commit at capture: `2109f6f4` (implementation commit)
- Date: 2026-04-22
