# Instructions for the developer — PR #497

Please address the following before merge. Items are ordered by priority.

---

## P1 — Reconcile `DebriefFeatureCollection` spec drift

**The problem:** The implementation requires callers to unwrap `DebriefFeatureCollection` to `.features[]`, but the spec explicitly forbids this:

- `spec.md` FR-001 requires `calculateBounds` to accept `DebriefFeatureCollection` **without casts**.
- `spec.md` Edge Cases: *"The unified signature MUST NOT force every caller to unwrap to `features[]` first."*
- `shared/utils/tests/bounds.types.test-d.ts:42` actively asserts the opposite with `@ts-expect-error`.
- `specs/219-unify-bounds-utilities/quickstart.md:147-148` instructs callers to migrate `calculateBounds(fc)` → `calculateBounds(fc.features)`.

**Pick one path and apply it consistently:**

### Option A — widen the signature to match the spec (preferred)

1. In `shared/utils/src/bounds.ts`, change the `calculateBounds` parameter from `ReadonlyArray<BoundsInputFeature>` to:
   ```ts
   ReadonlyArray<BoundsInputFeature> | { features: ReadonlyArray<BoundsInputFeature> }
   ```
2. At the top of the function body, auto-unwrap:
   ```ts
   const featureArray = Array.isArray(features) ? features : features.features;
   ```
3. Update the module doc block (top of `bounds.ts`) to list `FeatureCollection`-shaped input as a fourth accepted shape.
4. In `shared/utils/tests/bounds.types.test-d.ts`, **remove** the `@ts-expect-error` on line 42 and replace it with a positive `expectTypeOf(calculateBounds).toBeCallableWith(debriefFeatureCollection)` assertion for `DebriefFeatureCollection` and a plain GeoJSON `FeatureCollection`.
5. In `shared/utils/tests/bounds.test.ts`, change the "FeatureCollection-shaped input" suite (around line 369) so that at least one test passes the **collection object** directly — not `.features` — to prove FR-001 and the Edge Case at runtime.
6. Update `specs/219-unify-bounds-utilities/quickstart.md:147-148` — remove the "unwrap to `.features`" migration step.

### Option B — amend the spec to match the research decision

If you want to keep the implementation as-is:

1. Open `specs/219-unify-bounds-utilities/spec.md`:
   - Remove `DebriefFeatureCollection` from FR-001's accepted-types list.
   - Rewrite the "Feature collection as input" Edge Case to say callers MUST unwrap, and cross-reference `research.md` R-001 Option A as the rationale.
2. Run `/speckit.analyze` (or equivalent) to confirm spec/plan/research/quickstart agree.
3. Leave the code and type tests as they are.

Either path is acceptable; **do not ship the PR with the discrepancy unresolved.**

---

## P2 — Document the malformed-bbox behavioural change

The new fast-path rejects any bbox with a non-finite element and falls back to the coordinate walk. The pre-change `shared/components` version would have used a partially-valid bbox (padding missing entries with `?? 0`). `research.md` R-002 flags this as a deliberate bug-fix, but the PR body and CHANGELOG do not.

1. In `docs/CHANGELOG.md`, add a one-line note under the 219 entry:
   > "Malformed `feature.bbox` (non-finite values, length < 4) now falls back to coordinate walk silently. Previous behaviour in `shared/components` used `?? 0` padding, which could produce silently incorrect bounds."
2. In the PR description "Changes → Phase 4" section, add the same callout so reviewers of downstream consumers see the delta.

---

## P3 — Investigate the CI "Test & Lint" failure

The failure is almost certainly caused by component tests requiring built `@debrief/utils` output. I reproduced it locally: tests fail with `Failed to resolve entry for package "@debrief/utils"` until you run `pnpm --filter @debrief/utils build`, after which 1647/1647 pass.

1. Open the failing workflow run and confirm whether `Test & Lint` runs `pnpm -r build` (or the `@debrief/utils` build) before `pnpm -r test`.
2. If it does not, add a build step to `.github/workflows/ci.yml` **OR** add a `prebuild` / `pretest` script on `shared/components/package.json` that depends on the utils build. Pick whichever matches existing project convention.
3. Do **not** mark the failure "unrelated" in the PR body — verify root cause first. The "pre-existing failure" note currently in the PR description cites a different package (`@debrief/session-state`) from what I reproduced (`@debrief/utils`), so the claim needs re-checking.

---

## P4 — Minor clean-up

1. In `shared/utils/tests/bounds.test.ts`, the `BoundsTestFeatureCollection` interface (line 44-46) is declared but the collection itself is never passed to `calculateBounds`. Either:
   - Use it in at least one test (required if you take P1 Option A), or
   - Delete the unused interface.

2. No action needed, but note for future: `viewportToBounds` uses `Math.min(...lons)` (line 343) which breaks past ~100k spread args. Current input is 4 corners so it's safe. The `@remarks` already document this. Leave as-is.

---

## Verification checklist before re-requesting review

- [ ] P1 chosen path fully applied (code + types test + runtime test + quickstart all consistent)
- [ ] `pnpm --filter @debrief/utils test` → 300 pass
- [ ] `pnpm --filter @debrief/utils build && pnpm --filter @debrief/components test` → 1647 pass
- [ ] `pnpm -r typecheck` → all packages green
- [ ] `task verify` → green end-to-end
- [ ] `grep -rn "export function calculateBounds\|export const calculateBounds" shared/ apps/ services/ --include='*.ts'` → exactly one source match (ESLint fixtures excluded)
- [ ] `grep -rn "from '.*/utils/bounds'" shared/ apps/ services/ --include='*.ts'` → zero matches outside `shared/utils/`
- [ ] CHANGELOG entry updated (P2)
- [ ] CI "Test & Lint" job green (P3)
