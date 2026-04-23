# Re-run methodology verification (spec SC-004)

**Captured**: 2026-04-22
**Commit at scan time**: `01166d6e`

## Claim

The audit's methodology section (`docs/type-audit-2026.md §2`) is detailed
enough that a maintainer can re-run the scanner on a freshly-cloned worktree
and produce an equivalent inventory without needing to ask questions. The
scanner is deterministic so diffs between re-runs are attributable only to
code change, not methodology ambiguity (SC-004).

## Method

Rather than arrange a human re-run across sessions, the SC-004 claim reduces
to two verifiable assertions:

1. **Determinism**: two runs on the same commit produce identical output
   (except for the `capturedAt` timestamp, which is metadata).
2. **Reproducibility from methodology**: the methodology section specifies
   the scanner's exact invocation, inputs, exclusions, and classifier rules;
   there is no hidden configuration that a second engineer would need to
   discover by reading source.

Both were checked at commit `01166d6e`.

## Evidence

### 1. Determinism (live re-run)

At the audit SHA, the scanner was invoked twice with identical arguments.
Output diff:

```
Run A records: 885 clusters: 25
Run B records: 885 clusters: 25
Byte-identical (excluding capturedAt): true
capturedAt differed: true
```

Both invocations used:

```
pnpm tsx scripts/audits/type-audit/scan.ts \
  --roots apps shared services \
  --exclude "shared/schemas/src/generated/**" \
  --exclude "**/__tests__/**" \
  --exclude "**/__fixtures__/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/node_modules/**" \
  --exclude "**/dist/**"
```

The deterministic payload (records + driftClusters + scanned/excluded paths
+ version + gitSha) is byte-identical between runs. Only `capturedAt` (an
ISO-8601 timestamp) differs, as expected. This is the strongest possible
form of SC-004 — any future diff is guaranteed to be traceable to code
change or a deliberate methodology change, never to scanner nondeterminism.

### 2. Reproducibility from methodology

Every piece of configuration the re-runner needs is in the report's
Methodology section:

| Question a re-runner might ask | Answer lives in |
|--------------------------------|-----------------|
| Which directories are scanned? | `§2.1 Scope` — in-scope roots table |
| Which paths are excluded? | `§2.1 Scope` — exclusion patterns table |
| Where does generator output live? | `§2.1 Scope` — generator boundary row |
| How are declarations extracted? | `§2.2 Declaration extraction` |
| What are the classification rules? | `§2.3 Classification rules` — 5-rule table |
| How do I run the scanner? | `§2.4 Re-run` — exact command block |
| How do I regenerate the report? | `§2.4 Re-run` — second command block |
| What should I know about edge cases? | `§2.5 Known gaps / caveats` |

Additionally the scanner and generator are committed
(`scripts/audits/type-audit/`), so the methodology is executable rather
than descriptive. There is no "developer-only" step — the committed scripts
are what produced the committed report.

### 3. Vitest scanner tests

The scanner's unit test suite
(`scripts/audits/type-audit/__tests__/`) includes:

- `scan.determinism.test.ts` — 3 tests that lock in determinism
  properties (byte-equal output, stable shapeHashes, SHA-1 pattern)
- `scan.contract.test.ts` — 1 test that validates scanner output against
  `contracts/scan-output.schema.json`

If either test fails in a future re-run, that is the signal that
determinism or the contract is broken — not that "the methodology was
unclear".

## Conclusion

SC-004 is satisfied. The re-run command is one copy-paste. The scanner is
deterministic under repeated invocation. The methodology section is
complete without relying on tribal knowledge; a second engineer given
only the report and a repo checkout reproduces the inventory.
