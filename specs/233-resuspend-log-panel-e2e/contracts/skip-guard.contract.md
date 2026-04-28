# Contract: Log-Panel Skip-Guard Script

**File**: `scripts/check-log-panel-skip-guard.sh`
**Invoked by**: `Taskfile.yml` `lint:` task
**Purpose**: Fail the lint stage if `tests/e2e/test-log-panel.spec.ts` re-acquires `test.skip(`, `test.fixme(`, `test.describe.skip(`, or `test.describe.fixme(`.

This is the *contract* — the script's externally observable behaviour, independent of its bash implementation. The implementation is restored verbatim from `git show 5385f6e8:scripts/check-log-panel-skip-guard.sh` (see research.md Decision 3).

---

## Inputs

The script takes **no command-line arguments** and reads **no environment variables**. It hard-codes its target path:

```text
TARGET = tests/e2e/test-log-panel.spec.ts
```

It is invoked with the repo root as the current working directory (Taskfile invocation guarantees this).

## Outputs

### Exit codes

| Exit code | Meaning |
|-----------|---------|
| `0` | Clean — no `test.skip(`, `test.fixme(`, `test.describe.skip(`, or `test.describe.fixme(` found in the target file. |
| `1` | Violation — at least one of those markers is present, OR the target file is missing. |

### stdout (clean case)

A single line:

```text
✅ Log-panel skip-guard passed (tests/e2e/test-log-panel.spec.ts has no skip/fixme)
```

### stdout (violation case)

Multi-line, structured:

```text
❌ Log-panel skip-guard failed!

tests/e2e/test-log-panel.spec.ts must not contain test.skip, test.fixme,
test.describe.skip, or test.describe.fixme — see spec 210 FR-011.
Offending lines:

19:test.describe.fixme('Log Panel', () => {
```

(The "Offending lines" block prefixes each match with `<line-number>:` and reproduces the source line verbatim.)

### stdout (missing-target case)

```text
❌ Log-panel skip-guard: tests/e2e/test-log-panel.spec.ts not found
```

## Behavioural Invariants

1. **Bash-only.** No node, python, or other interpreter. Uses `set -euo pipefail` for fail-fast semantics.
2. **Single-file scope.** Only inspects `TARGET`. Does not walk other test files.
3. **Regex.** `^\s*test(\.describe)?\.(skip|fixme)\s*\(` — anchored to start-of-line allowing leading whitespace; matches both `test.skip(` / `test.fixme(` and `test.describe.skip(` / `test.describe.fixme(`.
4. **No false positives on string literals.** The anchor `^\s*` and the requirement of `(` immediately after the keyword mean prose comments like `// see test.fixme docs` won't trigger. Verified against the script's history of clean runs prior to #534.
5. **Idempotent.** Running the script twice on the same input produces the same output.
6. **No side effects.** Does not write files, does not modify the target, does not create directories.
7. **Fast.** Runtime measured in milliseconds (single `grep` invocation). Adds negligible cost to `task lint`.

## Acceptance — automated verification

After this feature lands, the following commands MUST all succeed at the repo root:

```sh
# Skip-guard script exists and is executable as bash
test -f scripts/check-log-panel-skip-guard.sh

# Clean case: returns 0 against the post-mute test file
bash scripts/check-log-panel-skip-guard.sh
# → exit 0
# → stdout: ✅ Log-panel skip-guard passed (...)

# task lint runs the script as part of the lint pipeline
task lint
# → exit 0
```

Negative-case verification (run once locally to prove the guard still bites — NOT committed):

```sh
# Temporarily re-add `.fixme` to the test file, run the guard, observe failure, revert
sed -i 's/test.describe(/test.describe.fixme(/' tests/e2e/test-log-panel.spec.ts
bash scripts/check-log-panel-skip-guard.sh
# → exit 1
# → stdout: ❌ Log-panel skip-guard failed! ... Offending lines: 19:test.describe.fixme('Log Panel', () => {
git checkout -- tests/e2e/test-log-panel.spec.ts
```

## Out of Contract Scope

- **Other suites.** This guard does not generalise to other test files. Story 2 of the spec mandates a *per-suite* spec when a sibling suite needs the same protection, not a generalised CLI.
- **CI matrix coverage.** The script does not detect skip/fixme markers introduced inside helpers under `tests/e2e/models/` or `tests/e2e/fixtures/` — those are intentional and may carry their own `.fixme` flags for unrelated reasons.
- **Performance assertions.** The script is not responsible for *how fast* the suite runs, only that none of it is muted. Performance gates (FR-008 in #230) are owned elsewhere.
