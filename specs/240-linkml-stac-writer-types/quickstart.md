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

## Step 2 — Regenerate and confirm zero drift (FR-006, SC-003)

```sh
task schema:generate                # or: cd shared/schemas && uv run python scripts/generate.py
git status -- shared/schemas/src/generated/
```

**Expected** (on a clean main / unchanged feature branch):

```text
On branch <…>
nothing to commit, working tree clean
```

**Pass**: `git status` reports no modified files under `shared/schemas/src/generated/`.
**Fail**: If files appear modified, the committed artefacts are stale relative to the LinkML source (or the generator is non-deterministic — research R3 caveat). Either commit the regenerated artefacts, or investigate whether the generator's output varies run-to-run.

---

## Step 3 — Confirm `@debrief/stac-writer` re-routes to the schema (FR-001, FR-007)

```sh
grep -n "PropertiesProvenanceEntry\|StacExtensionProperties" shared/stac-writer/src/interface.ts
```

**Expected**:

- One `import type { StacExtensionProperties } from '@debrief/schemas';` line.
- One `export type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';` line.
- **No** local `interface PropertiesProvenanceEntry { ... }` declaration.

**Pass**: The grep shows the import + re-export, with no local interface declaration.
**Fail**: A local declaration of `PropertiesProvenanceEntry` is still present — the migration's TS-side work is incomplete.

---

## Step 4 — Confirm the Properties Panel keeps its constants + validator (FR-007)

```sh
grep -nE "PROPERTIES_PANEL_TOOL_SENTINEL|isValidPropertiesProvenanceEntry|PROVENANCE_LOG_CAP|PROVENANCE_LOG_ARCHIVE_FILENAME" \
  shared/components/src/PropertiesPanel/provenanceTypes.ts
```

**Expected**: All four names appear as exported declarations.

**Pass**: All four are present.
**Fail**: If any are missing, downstream consumers (`apps/vscode/src/services/stacService.ts`, etc.) will fail to compile.

---

## Step 5 — Type-check the workspace (FR-007, SC-002)

```sh
pnpm -r typecheck
```

**Expected**: All packages pass `tsc --noEmit`. Particularly `@debrief/components`, `@debrief/stac-writer`, `apps/vscode`, `apps/web-shell`.

**Pass**: Zero TypeScript errors.
**Fail**: A consumer somewhere broke. Likely culprits:

- A caller relies on the *literal-string* nature of `tool` / `method` / `source` (research R2). Add a runtime `isValidPropertiesProvenanceEntry()` narrowing call before the assignment.
- A caller passes `'tool'` or `'import'` as `source` (research R4 — should not happen, but if it does, investigate whether it was meaningful or accidental).

---

## Step 6 — Confirm the writer's `StacItem` accepts existing items (FR-008, SC-004)

This is the byte-equivalence round-trip. Two execution paths:

### 6a — Python (existing test, just run it)

```sh
cd shared/schemas
uv run pytest tests/test_roundtrip.py -v
```

**Pass**: All round-trip tests pass.

### 6b — TypeScript (writer side, smoke test)

A small smoke test goes here once `tasks.md` lays out test files. The semantics:

```typescript
import type { StacItem } from '@debrief/stac-writer';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = 'preview/workspace/samples/local-store';
for (const entry of readdirSync(root)) {
  const itemPath = join(root, entry, 'item.json');
  const raw = readFileSync(itemPath, 'utf8');
  const item = JSON.parse(raw) as StacItem;          // must compile
  const reSerialised = JSON.stringify(item, null, 2); // structural equivalence test
  // (Strict byte-equivalence is verified by the Python test above; this is the TS-surface smoke test.)
}
```

**Pass**: Every sample item parses into the post-migration `StacItem` type without TypeScript narrowing errors and without runtime exceptions.

---

## Step 7 — Confirm the drift CI gate is wired (FR-006)

```sh
grep -nA 5 "Check generated artefacts are up-to-date" .github/workflows/schema-tests.yml
```

**Expected**: A workflow step matching the contract in `contracts/stac-writer-public-types.md` §5, with `git diff --exit-code` and a failure message naming `task schema:generate`.

**Pass**: The step exists.
**Fail**: The CI gate is missing — drift will silently recur.

---

## Step 8 — Provoke the drift check (negative test, SC-003)

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

## Step 9 — Confirm Article II.1 audit cleared (SC-005)

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

**Expected**: The only matches are the **re-exports** in:

- `shared/schemas/src/generated/typescript/types.ts` (canonical `interface`)
- `shared/components/src/PropertiesPanel/provenanceTypes.ts` (re-export `type` alias)
- `shared/stac-writer/src/interface.ts` (re-export `type` alias)

**Pass**: No additional `interface PropertiesProvenanceEntry { ... }` *body* declarations exist outside the generated file.
**Fail**: A new hand-write has crept in.

---

## Step 10 — End-to-end (full `task verify`)

```sh
task verify
```

**Expected**: `task lint`, `task typecheck`, `task test` all green.

**Pass**: All three pass — the migration is complete and CI-equivalent.

---

## Common failure modes & first-aid

| Symptom | Likely cause | First fix |
|---------|--------------|-----------|
| `tsc` errors about `tool`, `method`, `source` no longer being literal types | A caller relied on literal-string narrowing (research R2) | Add `isValidPropertiesProvenanceEntry(entry)` narrowing before the assignment, or compare to `PROPERTIES_PANEL_TOOL_SENTINEL` directly |
| `tsc` errors about `StacExtensionProperties` not exported from `@debrief/schemas` | Generated TS is stale | `task schema:generate` then commit |
| `git status` shows generated files modified after `task schema:generate` even on main | Generator non-determinism, or someone committed hand-edited artefacts upstream | Investigate; add `prettier --write` normalisation pass to the generator script if needed |
| Round-trip test fails on a specific sample item | New required field accidentally added to `StacExtensionProperties` | Roll back the LinkML change; required fields on `StacExtensionProperties` are forbidden by FR-008 |
| Drift check passes on a hand-edit PR | Path filter excluded `shared/schemas/src/generated/**` from the workflow | Update `paths:` filter in `.github/workflows/schema-tests.yml` to include the generated path |
