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

**Generator is deterministic — once the environment-dependent `source_file` path is normalised.** Same-machine determinism (two consecutive runs producing byte-identical output) was verified on the first capture. Cross-environment determinism was NOT verified until the drift gate's first real CI run flagged a 1-line diff in the generated Pydantic file (see "Cross-environment correction" below). After the fix, both same-machine and cross-environment runs produce byte-identical output, and the CI drift check (T013) ships as designed without a `prettier --write` / `ruff format` step between regeneration and diff.

This satisfies SC-007 in `spec.md`. Phase 2 may now begin.

## Cross-environment correction (captured post-merge, 2026-05-11)

The first CI run of the drift gate on PR #604 (commit `9cbdbea`) caught a real environment-dependent leak that this evidence file's original same-machine verification could not have detected:

```diff
- 'source_file': '/home/user/debrief-future/shared/schemas/src/linkml/debrief.yaml',
+ 'source_file': '/home/runner/work/debrief-future/debrief-future/shared/schemas/src/linkml/debrief.yaml',
```

`linkml`'s `gen-pydantic` emits the **absolute path** of the input schema YAML into the generated `LinkMLMeta.source_file` metadata. That path differs between any two machines, so two-runs-on-one-machine determinism is necessary but not sufficient for a usable drift gate.

The fix lives in `shared/schemas/scripts/generate.py` (the `generate_pydantic()` post-processor): a single regex substitution rewrites `'source_file': '<absolute>/src/linkml/<name>.yaml'` to `'source_file': 'src/linkml/<name>.yaml'` before the file is written. Re-running the generator after the fix produces identical output across both `/home/user/...` and `/home/runner/...` working directories.

Generated TypeScript and JSON Schema outputs were grepped for similar absolute-path leaks: none found.

**Lesson for future generator-driven CI gates:** verify determinism on at least two different absolute base paths, not just two consecutive runs in the same directory. A symlink trick (or a tempdir copy of the source tree) would have caught this earlier.

## Notes

- The generator script (`shared/schemas/scripts/generate.py`) and its underlying LinkML tools (`gen-pydantic`, `gen-typescript`, `gen-json-schema`) all produce byte-stable output for this schema source on this Python / linkml stack (Python 3.11, `uv sync` resolved versions) — after the `source_file` normalisation post-processor.
- The existing `// AUTO-GENERATED — DO NOT EDIT` header in `shared/schemas/src/generated/typescript/types.ts` does not contain a timestamp — confirmed by inspection — which is one common source of generator non-determinism.
- Future contributors who change the generator pipeline should re-run this verification (ideally including a different-base-path step) before relying on the drift gate.
