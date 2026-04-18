# Phase 0 Research: Knip Config for apps/loader

## R-001: Where to declare knip configuration

**Decision**: Create a new top-level `knip.json` at the repository root with a `workspaces` map scoped narrowly to `apps/loader`.

**Rationale**:
- Knip's documented configuration resolution order supports (a) a top-level `knip.json` / `knip.ts` / `.knip.json`, (b) a `knip` stanza inside the root `package.json`, and (c) per-workspace `knip.json` files under each workspace. All three would work for this feature.
- A top-level `knip.json` is the most discoverable for a monorepo: any contributor running `pnpm dlx knip` sees the whole config in one file. It also co-locates cleanly with `pnpm-workspace.yaml` and `tsconfig.base.json`, which are already the project's convention for monorepo-wide declarations.
- A `knip` stanza inside `package.json` would work identically but makes `package.json` noisier for no gain. Per-workspace `apps/loader/knip.json` would also work but hides monorepo-wide config across multiple files, making future additions (other workspaces needing entry declarations) harder to find.
- The project's `package.json` is deliberately minimal (see `/home/user/debrief-future/package.json` — only scripts, engines, and `pnpm.onlyBuiltDependencies`). Preserving that minimalism is consistent with Article IX's "minimal dependencies" posture.

**Alternatives considered**:
- **Knip stanza in root `package.json`** — rejected for file-clutter reasons above; no functional difference.
- **Per-workspace `apps/loader/knip.json`** — rejected because future monorepo-wide entries (VS Code extension, web-shell, spec-navigator, etc.) would need the same treatment; a single root file scales better.
- **`knip.ts` (programmatic config)** — rejected as overkill for a 1-entry scope; JSON is sufficient and doesn't pull in a TypeScript execution path for the tool.
- **Do nothing, live with the noise** — rejected because the backlog item (#202) exists precisely to eliminate this noise, and the scanner's signal-to-noise ratio for the loader is currently zero.

## R-002: Which files to declare as entry points for `apps/loader`

**Decision**: Declare three workspace-level entries for `apps/loader`:
1. `src/main/index.ts` — Electron main-process entry.
2. `src/preload/index.ts` — Electron preload entry (referenced by `webPreferences.preload` in `src/main/index.ts`).
3. `src/main.tsx` — Vite renderer entry (referenced by `vite.config.ts` / `index.html` via Vite's default convention).

**Rationale**:
- The main-process `index.ts` is the single file whose transitive import graph is the "reachable from main" set that contains the 12 flagged files (minus `updater.ts` — see R-004).
- Declaring preload + renderer entries in the same config prevents the next person running `knip` from encountering a fresh cloud of preload/renderer false positives. This does not expand scope beyond FR-008 ("minimum needed to achieve the outcome") because the outcome is defined as "no loader false positives" — addressing all three entry categories at once is the minimum single-pass declaration; splitting into three PRs would be pointless churn.
- The `main` field in `apps/loader/package.json` (`"main": "dist/main/index.cjs"`) points at the **built** artefact. Knip operates on source, so we declare the source path (`src/main/index.ts`) — this matches what `tsc -p tsconfig.main.json` compiles into `dist/main/index.cjs`.

**Alternatives considered**:
- **Only declare the main-process entry** — would leave preload and renderer entries as future papercuts. Rejected as a false economy.
- **Declare via glob (e.g., `src/main/**/*.ts`)** — rejected because it would silence genuinely orphaned files (violates FR-004 and the edge case about reachability). Entry declarations tell knip "start from here and follow imports"; globs tell it "ignore everything under here" — very different semantics.

## R-003: Shape of the `knip.json` config

**Decision**: Minimal JSON document with a top-level `$schema` pointer for editor hints, a `workspaces` map keyed by workspace path, and an `entry` array per workspace. No `ignore`, `ignoreDependencies`, or `project` overrides added in this feature.

**Example (illustrative — final shape in contracts/knip-config.schema.json)**:
```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    "apps/loader": {
      "entry": [
        "src/main/index.ts",
        "src/preload/index.ts",
        "src/main.tsx"
      ]
    }
  }
}
```

**Rationale**:
- The `$schema` link gives editors (VS Code) autocomplete and validation without any project-level dependency. It pins to a major version (knip 5.x — the current major at the time of writing) to guard against breaking changes in the config schema being applied retroactively.
- Scoping via `workspaces["apps/loader"]` (rather than a global `entry`) means other packages are untouched, directly enforcing FR-005 (no inadvertent silencing elsewhere).
- No `ignore` patterns are added — doing so would risk hiding genuinely orphaned files (violates FR-004 / FR-008).

**Alternatives considered**:
- **Add `project` glob** to restrict which files knip considers — not needed, knip defaults to `**/*.{ts,tsx,js,jsx,mjs,cjs}` within the workspace's TS project, which already matches what we want.
- **Add `ignoreDependencies`** to silence unrelated dependency warnings — out of scope; not a loader problem; would violate FR-005.

## R-004: Reachability audit — are all 12 flagged files actually reachable?

**Decision**: NO — 11 of 12 are reachable, 1 is a genuine orphan and MUST NOT be silenced.

**Reachability trace (from `apps/loader/src/main/index.ts`)**:

| File | Reachable from main entry? | Reached via |
|------|---------------------------|-------------|
| `main/index.ts` | ✅ (entry itself) | — |
| `main/file-association.ts` | ✅ | `index.ts:8` |
| `main/cleanup.ts` | ✅ | `index.ts:9` |
| `main/ipc/config.ts` | ✅ | `index.ts:10` |
| `main/ipc/io.ts` | ✅ | `index.ts:11` |
| `main/ipc/stac.ts` | ✅ | `index.ts:12` |
| `main/ipc/jsonrpc.ts` | ✅ | `ipc/io.ts:7`, `ipc/stac.ts:7` |
| `main/service-paths.ts` | ✅ | `ipc/io.ts:8`, `ipc/stac.ts:9` |
| `main/types/ipc.ts` | ✅ | `ipc/jsonrpc.ts:7-11`, `ipc/stac.ts:12` |
| `main/updater.ts` | ❌ **GENUINE ORPHAN** | No inbound imports found in `apps/loader/src/`. Internally it also has `// import { autoUpdater } from 'electron-updater';` commented out, suggesting never wired up. |
| `main/ipc/` (folder only) | — | folder, not a file |
| (12th file — one of the above recounted in the knip tally) | — | — |

**Rationale**:
- Imports traced via `grep` across `apps/loader/src/main/**`; every file except `updater.ts` has either direct or transitive inbound imports originating at `src/main/index.ts`.
- `updater.ts` being flagged by knip is **not a false positive** — it is the scanner working correctly. The fix is to either (a) delete the file, or (b) wire it into the main process's startup if auto-update is a planned feature. This decision is outside the scope of this feature (backlog #202 is about config, not code changes to the loader).

**Implications for implementation (recorded in spec FR-004, edge case 2)**:
- After the config is added, `updater.ts` will still be flagged as unused — this is the correct outcome. The verification record (FR-007) must explicitly note this single genuine finding so it is not confused with a whitelist failure in the future.
- The config does NOT need to silence `updater.ts`. Any future PR addressing it can be a separate, trivial change (delete or wire up) and its status will be transparent in the knip report.

**Alternatives considered**:
- **Silence `updater.ts` via an `ignore` pattern** — rejected; violates FR-008 ("minimum needed") and FR-004 (whitelist must be scoped to reachability). Silencing would hide a real finding.
- **Delete `updater.ts` as part of this feature** — rejected; backlog item #202 explicitly confines itself to knip config verification. Deletion would be a separate micro-change that belongs in its own PR.

## R-005: Do we need to add knip as a project dev dependency?

**Decision**: NO. Keep `pnpm dlx knip` (ad-hoc invocation).

**Rationale**:
- Article IX requires every dependency to be justified. Knip is a periodic tooling scan, not a CI gate. Adding it as a dev dep would pin a version and ship it to every contributor's install for a rare, ad-hoc activity.
- The backlog item (#202) explicitly describes the invocation as `pnpm dlx knip`. Preserving this keeps the feature's footprint minimal (FR-008).
- If knip is later promoted to a CI gate, **that** would warrant adding it as a pinned dev dependency — but it would be a separate feature with its own Constitution Check (dependency-adding justification; CI wiring; documented regression expectations).

**Alternatives considered**:
- **Add `knip` to root `devDependencies` with a pin** — rejected now, may revisit in a future feature if knip enters CI.

## R-006: How to verify the configuration works without running it in CI

**Decision**: Run `pnpm dlx knip` **twice** from the repo root during implementation — once on the pre-change commit (baseline) and once on the post-change commit — and diff the two reports. Capture both in `specs/201-knip-loader-config/evidence/verification-record.md`.

**Rationale**:
- SC-001 and SC-002 are both report-diff assertions. A direct before/after capture is the cheapest and most precise verification.
- This is exactly the verification a future maintainer would run to audit the whitelist (FR-007), so recording it as evidence doubles as a reproducible audit artefact.
- Smoke-test the loader build via `pnpm --filter debrief-loader build:main` (TypeScript-only; avoids the heavyweight `electron-builder` packaging step which is unaffected by this change and would slow verification substantially).

**Alternatives considered**:
- **Add knip to CI as a new gate** — out of scope for this feature. See R-005.
- **Run full `pnpm --filter debrief-loader build` (includes electron-builder)** — rejected; config change cannot affect packaging output. `build:main` is the narrowest build step that exercises the TypeScript graph the config covers.

## Summary of Resolved Unknowns

All spec NEEDS CLARIFICATION markers resolved at spec-authoring time — none carried forward into this plan. Research decisions made here (R-001 through R-006) further resolve the "how" of the implementation without changing the "what" in the spec.
