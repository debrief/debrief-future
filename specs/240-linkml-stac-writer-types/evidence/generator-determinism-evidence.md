# Generator Determinism Evidence (SC-007)

**Captured**: 2026-05-09
**Git SHA**: `126d5e6881f8ff1744475259e472cb11a09b198a` (branch `claude/start-speckit-240-DixZc`)
**Status**: ✅ **PASS — generator is byte-deterministic across two consecutive runs**

This evidence file is the gating verification for the CI drift check (Phase 4 / T013–T016 of `tasks.md`). A non-deterministic generator would make the drift gate flaky and unusable; verification before the gate ships is a P0 task per `/speckit.review` decision 5.

## Procedure

Per `quickstart.md` Step 2:

1. Verified pre-condition: `git status --porcelain shared/schemas/src/generated/` empty.
2. Ran `cd shared/schemas && uv run python scripts/generate.py` (first run).
3. Asserted `git diff --quiet -- shared/schemas/src/generated/` exits 0 → empty output.
4. Ran the generator a second time.
5. Asserted `git diff --quiet -- shared/schemas/src/generated/` again exits 0 → empty output.

## Result

```
$ git status --porcelain shared/schemas/src/generated/
(empty — no modified files)

$ git --no-pager diff --stat -- shared/schemas/src/generated/
(empty)

$ git rev-parse HEAD
126d5e6881f8ff1744475259e472cb11a09b198a
```

## Conclusion

**Generator is deterministic.** The first run produced byte-identical output to the committed artefacts (i.e. the committed output is already a fresh-regen result). The second run produced byte-identical output to the first. No normalisation pass is needed; the CI drift check (T013) can ship as designed without a `prettier --write` / `ruff format` step between regeneration and diff.

This satisfies SC-007 in `spec.md`. Phase 2 may now begin.

## Notes

- The generator script (`shared/schemas/scripts/generate.py`) and its underlying LinkML tools (`gen-pydantic`, `gen-typescript`, `gen-json-schema`) all produce byte-stable output for this schema source on this Python / linkml stack (Python 3.11, `uv sync` resolved versions).
- The existing `// AUTO-GENERATED — DO NOT EDIT` header in `shared/schemas/src/generated/typescript/types.ts` does not contain a timestamp — confirmed by inspection — which is one common source of generator non-determinism.
- Future contributors who change the generator pipeline should re-run this verification before relying on the drift gate.
