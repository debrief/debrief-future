# Quickstart: Validating spec 240 locally

**Feature**: 240-linkml-stac-writer-types
**Audience**: Developer implementing or reviewing the migration
**Prerequisites**: Repo cloned, `pnpm install` and `uv sync` run, `task` available (or fall back to the explicit commands).

This walkthrough is the local mirror of the CI gates. Each step has a single pass/fail signal and maps to a Functional Requirement (FR) or Success Criterion (SC) in `spec.md`.

---

## Step 1 — Confirm the LinkML source is the canonical home (FR-001, FR-003)

```sh
grep -nA 50 "^PropertiesProvenanceEntry:" shared/schemas/src/linkml/stac-extension.yaml | head -55
```

**Expected**: A concrete LinkML class with `activity_id`, `timestamp`, `tool`, `method`, `fields`, `source` attributes, all `required: true`. (This already exists today — see research R1 / R2 / data-model §1.1.)

**Pass**: Output shows the class definition starting at the matching line.
**Fail**: If the class is missing, the migration's premise is wrong — stop and re-investigate.

---

## Step 2 — Verify generator determinism (SC-007, gates Step 3)

This is the P0 gating verification added after `/speckit.review`. The drift check (Step 3) is unsafe to ship until the generator is proven byte-deterministic.

```sh
# On a clean checkout (no uncommitted changes under shared/schemas/src/generated/):
git status --porcelain -- shared/schemas/src/generated/   # MUST be empty
task schema:generate
git diff --quiet -- shared/schemas/src/generated/         # MUST exit 0
task schema:generate
git diff --quiet -- shared/schemas/src/generated/         # MUST still exit 0
```

**Pass**: Both `git diff --quiet` invocations exit 0. Generator is deterministic; proceed to Step 3.
**Fail**: A `git diff` call exits 1. Investigate — likely culprits: dictionary key ordering, embedded timestamps, version-string drift in headers. Fix at the generator level if possible; otherwise add a normalisation pass (e.g. `prettier --write` for `.ts`; equivalent for Pydantic) to `scripts/generate.py` after each emit, then re-run this step until both diffs are quiet. Do not proceed to Step 3 until this passes.

---

## Step 3 — Regenerate and confirm zero drift (FR-006, SC-003)

```sh
task schema:generate                # or: cd shared/schemas && uv run python scripts/generate.py
git status -- shared/schemas/src/generated/
```

**Expected** (on a clean main / unchanged feature branch, with Step 2 already passing):

```text
On branch <…>
nothing to commit, working tree clean
```

**Pass**: `git status` reports no modified files under `shared/schemas/src/generated/`.
**Fail**: If files appear modified, the committed artefacts are stale relative to the LinkML source. Commit the regenerated artefacts. (If Step 2 was passing but this step fails, the upstream `main` shipped without a regeneration; the drift check this feature adds will catch the recurrence.)

---

## Step 4 — Confirm `@debrief/stac-writer` re-routes to the components-side narrowed type (FR-001, FR-007)

```sh
grep -n "PropertiesProvenanceEntry\|StacItem" shared/stac-writer/src/interface.ts
```

**Expected**:

- The hand-written `interface PropertiesProvenanceEntry { ... }` (lines 42–49 today) is **gone**.
- Exactly one `export type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';` re-export.
- The hand-written `interface StacItem { ... }` is **unchanged** (out of scope per `/speckit.review` — see research R1).

**Pass**: The grep shows `StacItem` interface intact, plus a re-export of `PropertiesProvenanceEntry` with no local interface for the latter.
**Fail**: A local declaration of `PropertiesProvenanceEntry` is still present, OR `StacItem` has been accidentally rewritten — both indicate the migration is incomplete or has overshot scope.

Also verify the workspace dep edge:

```sh
grep -nA 1 '"@debrief/components"' shared/stac-writer/package.json
```

**Expected**: `"@debrief/components": "workspace:*"` under `dependencies`.

---

## Step 5 — Confirm the Properties Panel uses the hybrid intersection (FR-007, R2)

```sh
grep -nE "PROPERTIES_PANEL_TOOL_SENTINEL|isValidPropertiesProvenanceEntry|PROVENANCE_LOG_CAP|PROVENANCE_LOG_ARCHIVE_FILENAME|Omit<.*Generated" \
  shared/components/src/PropertiesPanel/provenanceTypes.ts
```

**Expected**:

- All four names (`PROPERTIES_PANEL_TOOL_SENTINEL`, `isValidPropertiesProvenanceEntry`, `PROVENANCE_LOG_CAP`, `PROVENANCE_LOG_ARCHIVE_FILENAME`) appear as exported declarations.
- An `Omit<…Generated, 'tool' | 'method' | 'source'>` intersection appears in the `PropertiesProvenanceEntry` type alias.
- The local `interface PropertiesProvenanceEntry { ... }` (lines 9–22 today) is **gone**.

**Pass**: All four constants/validator present + intersection present + no local `interface` body.
**Fail**: If any constant/validator is missing, downstream consumers will fail to compile. If the intersection is missing or only re-exports `Generated` directly, literal-string narrowing on `tool`/`method`/`source` is lost — re-introduces the Article I.3 silent-failure path R2 was designed to close.

---

## Step 6 — Type-check the workspace (FR-007, SC-002)

```sh
pnpm -r typecheck
```

**Expected**: All packages pass `tsc --noEmit`. Particularly `@debrief/components`, `@debrief/stac-writer`, `apps/vscode`, `apps/web-shell`.

**Pass**: Zero TypeScript errors. Note specifically that `stacService.ts:1326` (`tool: PROPERTIES_PANEL_TOOL_SENTINEL`) and `stacWriterIdb.ts:335` continue to type-check — the hybrid intersection preserves their literal-string acceptance.
**Fail**: Most likely a consumer started passing a non-`'user'` value to `source`, or a non-template-conforming string to `method`, or a non-`PROPERTIES_PANEL_TOOL_SENTINEL` string to `tool`. The hybrid intersection is doing its job — investigate whether the offending caller was always wrong, or whether the schema needs widening (in which case adjust the LinkML pattern AND the components-side intersection in lock-step).

---

## Step 7 — Confirm STAC Item round-trip still passes (FR-008, SC-004)

`StacItem` is unchanged by this feature, so the round-trip invariant is trivially preserved on the writer side. Run the existing tests as a smoke check that the workspace dep edge / ESLint rule didn't accidentally break the writer:

### 7a — Python (existing test)

```sh
cd shared/schemas
uv run pytest tests/test_roundtrip.py -v
```

**Pass**: All round-trip tests pass.

### 7b — Optional TS-side smoke test

A small smoke test belongs in `tasks.md` as a hedge against future workspace-dep / ESLint regressions. The semantics:

```typescript
import type { StacItem } from '@debrief/stac-writer';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = 'preview/workspace/samples/local-store';
for (const entry of readdirSync(root)) {
  const itemPath = join(root, entry, 'item.json');
  const raw = readFileSync(itemPath, 'utf8');
  const item = JSON.parse(raw) as StacItem;          // must compile against the unchanged StacItem
  const reSerialised = JSON.stringify(item, null, 2); // structural equivalence test
}
```

**Pass**: Every sample item parses against the (unchanged) `StacItem` and re-serialises without exception.

---

## Step 8 — Confirm the drift CI gate is wired (FR-006)

```sh
grep -nA 5 "Check generated artefacts are up-to-date" .github/workflows/schema-tests.yml
```

**Expected**: A workflow step matching the contract in `contracts/stac-writer-public-types.md` §5, with `git diff --exit-code` and a failure message naming `task schema:generate`.

**Pass**: The step exists.
**Fail**: The CI gate is missing — drift will silently recur.

---

## Step 9 — Provoke the drift check (negative test, SC-003)

This is the *deliberate-drift* acceptance walkthrough referenced in spec SC-003 and FR-006. Run on a throwaway branch only.

```sh
git checkout -b throwaway/drift-check-test
# Hand-edit a generated file:
sed -i 's/tool: string/tool: number/' shared/schemas/src/generated/typescript/types.ts   # or any benign edit
git add shared/schemas/src/generated/typescript/types.ts
git commit -m 'drift check probe'
git push -u origin throwaway/drift-check-test
gh pr create --fill --base main
# Wait for CI; expect Schema Tests workflow to fail at the new drift step.
```

**Expected CI behaviour**: The "Check generated artefacts are up-to-date" step fails within one schema-tests.yml run, with a message naming the regeneration command.

**Pass**: CI fails as expected.
**Fail**: CI passes despite the deliberate drift — the gate is misconfigured or path-filtered out.

**Cleanup**: `git push origin --delete throwaway/drift-check-test` and close the PR.

---

## Step 10 — Confirm Article II.1 audit cleared for `PropertiesProvenanceEntry` (SC-005)

Manual review:

```sh
# Should return zero matches outside the LinkML source and the generated TS:
grep -rn "interface PropertiesProvenanceEntry\b\|type PropertiesProvenanceEntry =" \
  --include='*.ts' \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  shared apps services
```

**Expected**: The only matches are:

- `shared/schemas/src/generated/typescript/types.ts` — canonical `interface` (LinkML-generated).
- `shared/components/src/PropertiesPanel/provenanceTypes.ts` — `type` alias as the hybrid intersection.
- `shared/stac-writer/src/interface.ts` — `export type` re-export from the components-side declaration.

**Pass**: No additional `interface PropertiesProvenanceEntry { ... }` *body* declarations exist outside the generated file. (Intersection / re-export aliases are fine — they delegate to the canonical body.)
**Fail**: A new hand-write has crept in. *(Note: `StacItem` remaining hand-written is expected — it's tracked as a separate backlog deferral, not a Step-10 failure.)*

---

## Step 11 — End-to-end (full `task verify`)

```sh
task verify
```

**Expected**: `task lint`, `task typecheck`, `task test` all green.

**Pass**: All three pass — the migration is complete and CI-equivalent.

---

## Common failure modes & first-aid

| Symptom | Likely cause | First fix |
|---------|--------------|-----------|
| `tsc` errors about `'foo'` not assignable to `'user'` (or to `typeof PROPERTIES_PANEL_TOOL_SENTINEL`) | The hybrid intersection is doing its job — a caller is passing a non-canonical value | Investigate whether the caller was always wrong (typo), or whether the schema needs widening (in which case adjust the LinkML pattern AND the components-side intersection in lock-step) |
| `tsc` errors about `Generated` (the imported alias) not having a property | Generated TS is stale or the LinkML class shape changed | `task schema:generate` then commit |
| `git status` shows generated files modified after `task schema:generate` even on main | Generator non-determinism (Step 2 was skipped or regressed) | Re-run Step 2 verification; add a normalisation pass to `scripts/generate.py` if needed |
| ESLint error: "Runtime imports from `@debrief/components` are banned in `shared/stac-writer/`" | A non-type import sneaked in past the writer's lean-package boundary | Convert to `import type { ... }`; if a runtime symbol is genuinely needed, route it through a different path or add an explicit ESLint disable with justification |
| Round-trip test fails on a specific sample item | Likely unrelated to this feature (`StacItem` is unchanged); could be a side-effect of the workspace dep edge breaking the writer's build | Re-check Step 4 (workspace dep edge in `package.json`) and Step 6 (full typecheck) before suspecting the round-trip |
| Drift check passes on a hand-edit PR | Path filter excluded `shared/schemas/src/generated/**` from the workflow, OR the generator is non-deterministic so the diff is "expected" noise | Confirm path filter; re-run Step 2 verification |
