# Contract: `scripts/check-bundle-size.mjs` (post-#247)

**Spec**: [../spec.md](../spec.md) (FR-007) | **Plan**: [../plan.md](../plan.md) | **Research**: [../research.md](../research.md) (R-1)

This is a CLI contract, not a network API. It governs the bundle-size guard
script invoked by CI and runnable locally. The contract changes only in
**what is measured**; the input/output surface of the CLI is preserved so CI
configuration does not need to change.

---

## Synopsis

```sh
node scripts/check-bundle-size.mjs
```

No arguments. No environment variables read. Working directory is the repo
root.

## Inputs

| Path | Required | Purpose |
|------|----------|---------|
| `scripts/bundle-baseline-244.json` | yes | Baseline values; see [data-model.md](../data-model.md) Entity 2 |
| `apps/backlog-navigator/dist/.vite/manifest.json` | yes | Vite build manifest; see [data-model.md](../data-model.md) Entity 1 |
| `apps/backlog-navigator/dist/<entry-chunk-file>` | yes | The entry chunk binary, resolved from the manifest |
| `apps/backlog-navigator/dist/assets/*.js` | optional | All JS chunks; printed for human review (informational only) |

## Behaviour

1. **Load baseline.** Read and parse `scripts/bundle-baseline-244.json`. If
   the file is missing or unparseable, exit with code 2.
2. **Load manifest.** Read and parse
   `apps/backlog-navigator/dist/.vite/manifest.json`. If the file is missing,
   the build was either not run or was run with `build.manifest = false`;
   exit with code 2 and instruct the user to run `pnpm --filter
   @debrief/backlog-navigator build`.
3. **Identify entry chunk.** Locate the single manifest entry where
   `isEntry === true`. If zero entries match, exit 2 (build misconfiguration).
   If more than one matches, exit 2 (the navigator is a single-entry SPA).
4. **Measure entry chunk.** Read the file at
   `apps/backlog-navigator/dist/<entry.file>`, gzip it with default
   compression, take the byte length.
5. **Compare against budget.** Compute
   `budget = floor(baseline_bytes * (1 + current_budget_pct / 100))`.
   - If `entry_gzipped > budget` → print failure summary, exit 1.
   - Else → print success summary, exit 0.
6. **Print per-chunk breakdown** in either case (so reviewers can see the
   split is real and the lazy chunks exist). Lazy chunks are listed but not
   compared against any budget.

## Outputs

### stdout (success — exit 0)

```text
Bundle-size guard for backlog-navigator
---------------------------------------
Entry chunk:             assets/index-XXXXXX.js
Baseline (gzipped):      <baseline_bytes> B  (commit <baseline.commit_sha[:7]>)
Current  (gzipped):      <entry_gzipped> B
Delta:                   <±delta> B  (<±delta_pct>%)
Budget (<budget_pct>% over):    <budget_bytes> B
Headroom:                +<headroom_bytes> B

All chunks (informational):
  assets/index-XXXXXX.js     (entry)        <bytes> B
  assets/mobile-YYYYYY.js    (lazy)         <bytes> B
  ...

OK: entry chunk within budget.
```

### stderr (failure — exit 1)

```text
FAIL: entry chunk gzipped size <entry_gzipped> B exceeds budget
      <budget_bytes> B (baseline <baseline_bytes> B + <budget_pct>%).
      Either trim the entry chunk, or amend scripts/bundle-baseline-244.json
      per the Issue 4A protocol.
```

### stderr (configuration error — exit 2)

```text
ERROR: <one of>
  - baseline file not found at <path>
  - dist not built. Run `pnpm --filter @debrief/backlog-navigator build` first.
  - manifest not found at <path>. Ensure vite.config.ts has build.manifest=true.
  - manifest contains zero entries with isEntry=true.
  - manifest contains <N> entries with isEntry=true; expected exactly 1.
  - entry chunk file <path> not found on disk.
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Entry chunk within budget |
| 1 | Entry chunk exceeds budget |
| 2 | Configuration error (cannot evaluate) |

These codes are unchanged from the pre-#247 contract; CI's existing handling
of "non-zero = fail" continues to work.

## Differences vs. pre-#247

| Aspect | Pre-#247 | Post-#247 |
|--------|----------|-----------|
| What is measured | Sum of every `dist/assets/*.js` | The single entry chunk identified via Vite manifest |
| Manifest required | No | Yes |
| Per-file breakdown | Always shown | Always shown, with `(entry)` / `(lazy)` annotation |
| Exit codes | 0 / 1 / 2 | 0 / 1 / 2 (unchanged) |
| CLI args | None | None (unchanged) |
| Baseline file | `scripts/bundle-baseline-244.json` | Same file, re-baselined to entry-chunk-only |

## Test contract

A new Vitest unit test (`scripts/__tests__/check-bundle-size.test.mjs`)
exercises the script against fixture manifests:

| Test | Manifest | Expected exit | Expected stdout/stderr |
|------|----------|---------------|------------------------|
| Single entry within budget | one `isEntry: true`, file under budget | 0 | "OK: entry chunk within budget." |
| Single entry over budget | one `isEntry: true`, file over budget | 1 | "FAIL: entry chunk gzipped size..." |
| No entry | manifest contains no `isEntry: true` | 2 | "ERROR: manifest contains zero entries..." |
| Multiple entries | manifest contains two `isEntry: true` | 2 | "ERROR: manifest contains 2 entries..." |
| Manifest missing | dist exists but no manifest | 2 | "ERROR: manifest not found..." |
| Lazy chunks listed | manifest has entry + dynamic import | 0 | stdout includes both chunks with annotations |

Fixtures live in `scripts/__tests__/fixtures/manifests/` and are read by the
test using a temporary working-directory shim.
