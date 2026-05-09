# Drift Gate Evidence — Spec 240 / T016

**Captured**: 2026-05-09
**Git SHA at capture**: `f0e0c65` (branch `claude/start-speckit-240-DixZc`)
**Status**: ✅ **Detection logic verified locally** (live CI walkthrough deferred per implementation-time decision)

This evidence file captures the negative-path proof that the drift gate added by spec 240 fires correctly when a hand-edit lands on a generated artefact. The full live-CI walkthrough (push throwaway branch → open draft PR → watch CI fail) was intentionally skipped during implementation; the user accepted the trade-off of trading "live GH Actions log" proof for "no GitHub draft-PR clutter," reasoning that:

1. The local probe (below) exercises the same command sequence the CI YAML invokes.
2. The YAML wiring is verifiable by inspection (`.github/workflows/schema-tests.yml`, the new step after `Run schema generation`).
3. The first real PR after this feature lands that touches a generated artefact will exercise the gate end-to-end naturally.

## Local negative probe — what was run

On the active feature branch, simulating the CI flow:

```sh
# 1. Perturb a generated file (the kind of edit the gate must catch).
echo "// drift probe" >> shared/schemas/src/generated/typescript/types.ts

# 2. Stage and commit on a temp branch (the CI flow checks out a committed
#    state, so the perturbation must be committed for the test to be valid).
git checkout -b throwaway-drift-test
git add shared/schemas/src/generated/typescript/types.ts
git commit -m 'drift probe'

# 3. Run the generator (same command schema-tests.yml runs).
cd shared/schemas && uv run python scripts/generate.py

# 4. Run the drift check (same command the new CI step runs).
if ! git diff --quiet -- src/generated/; then
  echo "DRIFT DETECTED (expected)"
  git --no-pager diff --stat -- src/generated/
fi
```

## Local negative probe — what happened

```text
Switched to a new branch 'throwaway-drift-test'
[throwaway-drift-test 6d53f7b] drift probe
 1 file changed, 1 insertion(+)

[OK] Generation complete

DRIFT DETECTED (expected)
 shared/schemas/src/generated/typescript/types.ts | 1 -
 1 file changed, 1 deletion(-)
```

The drift check **correctly fired** — `git diff --quiet` reported a non-empty diff (the canonical regen removed the `// drift probe` line), exit code non-zero, message rendered. Cleanup deleted the temp branch.

## Mapping local probe → CI step

The new CI step in `.github/workflows/schema-tests.yml` (added by T013) runs:

```yaml
- name: Check generated artefacts are up-to-date
  run: |
    if ! git diff --exit-code -- src/generated/; then
      echo "::error::Generated artefacts under shared/schemas/src/generated/ have drifted from the LinkML source."
      echo "::error::Run 'task schema:generate' (or 'cd shared/schemas && uv run python scripts/generate.py') and commit the result."
      exit 1
    fi
```

This is the same `git diff` invocation the local probe used (the only differences: `--exit-code` instead of `--quiet`, both yield non-zero on diff; `::error::` GitHub Actions annotation prefix; explicit `exit 1`). On the local probe the equivalent of `--exit-code` was the surrounding `if ! ...; then ... fi` shell test.

## Confidence

| What's proven | How |
|---|---|
| Generator regenerates committed artefacts byte-identical when fresh-checkout has no drift | T001 (`evidence/generator-determinism-evidence.md`) |
| `git diff` correctly distinguishes "fresh regen of clean tree" from "fresh regen after hand-edit" | This local probe |
| The new CI step runs the same commands | Inspection of `.github/workflows/schema-tests.yml` (the YAML edit) |
| The CI step's failure message is correct | Inspection (the message is a literal `echo`, not a templated value) |
| The CI step actually executes on PRs | Inherits from the existing `Run schema generation` step in the same workflow, which already runs on the relevant trigger paths |

## What's NOT proven by this evidence

- That the GitHub Actions runner specifically renders the `::error::` annotations correctly (visible inline on the PR diff). This is a GH Actions feature, well-documented, and used elsewhere in this repo's workflows; treating it as a known-working primitive.
- That the workflow's path filter (`paths: ['shared/schemas/**', '.github/workflows/schema-tests.yml']`) catches a PR whose only change is hand-editing `shared/schemas/src/generated/typescript/types.ts`. The path filter does match `shared/schemas/**` (which includes the generated subtree), so this is also confidence-by-inspection.

The first real-world PR after this feature lands that exercises the gate (intentionally or accidentally) will close both gaps.
