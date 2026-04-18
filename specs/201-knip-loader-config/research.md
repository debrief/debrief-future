# Phase 0 Research: Knip Config + CI Gate for apps/loader

> **Note (2026-04-18)**: This research was refreshed after `/speckit.review` decided to expand scope (Issues 3B + 4). R-005 supersedes its prior version; R-007 and R-008 are new.

## R-001: Where to declare knip configuration

**Decision**: Create a new top-level `knip.json` at the repository root with a `workspaces` map scoped narrowly to `apps/loader`.

**Rationale**:
- Knip's documented configuration resolution order supports (a) a top-level `knip.json` / `knip.ts` / `.knip.json`, (b) a `knip` stanza inside the root `package.json`, and (c) per-workspace `knip.json` files under each workspace. All three would work for this feature.
- A top-level `knip.json` is the most discoverable for a monorepo: any contributor running `task knip` or `pnpm exec knip` sees the whole config in one file. It co-locates cleanly with `pnpm-workspace.yaml`, `tsconfig.base.json`, and `ruff.toml`, which are already the project's convention for monorepo-wide declarations.
- A `knip` stanza inside root `package.json` would work identically but makes `package.json` noisier for no gain. The project's root `package.json` is deliberately minimal; preserving that is consistent with Article IX's posture.
- Per-workspace `apps/loader/knip.json` would also work but hides monorepo-wide config across multiple files, making future additions harder to find.

**Alternatives considered**:
- Knip stanza in root `package.json` — rejected for file-clutter reasons.
- Per-workspace `apps/loader/knip.json` — rejected; future monorepo-wide entries (vscode, web-shell, spec-navigator, etc.) would need the same treatment.
- `knip.ts` (programmatic config) — rejected as overkill for a 1-workspace scope; JSON is sufficient and doesn't pull in a TypeScript execution path for the tool.
- Do nothing, live with the noise — rejected; backlog #202 exists precisely to eliminate this.

## R-002: Which files to declare as entry points for `apps/loader`

**Decision**: Declare three workspace-level entries:
1. `src/main/index.ts` — Electron main-process entry.
2. `src/preload/index.ts` — Electron preload entry (referenced by `webPreferences.preload` in `src/main/index.ts`).
3. `src/main.tsx` — Vite renderer entry (referenced by `vite.config.ts` / `index.html`).

**Rationale**:
- The main-process `index.ts` is the single file whose transitive import graph is the "reachable from main" set that contains the remaining 11 flagged files (after `updater.ts` deletion — see R-004).
- Declaring preload + renderer entries in the same config prevents the next person running `knip` from encountering a fresh cloud of preload/renderer false positives. This does not expand scope beyond FR-008 ("minimum needed to achieve the outcome") because the outcome is defined as "no loader false positives" — addressing all three entry categories at once is the minimum single-pass declaration.
- The `main` field in `apps/loader/package.json` (`"main": "dist/main/index.cjs"`) points at the **built** artefact. Knip operates on source, so we declare the source path (`src/main/index.ts`) — this matches what `tsc -p tsconfig.main.json` compiles into `dist/main/index.cjs`.

**Alternatives considered**:
- Only declare the main-process entry — rejected; leaves preload and renderer as future papercuts.
- Declare via glob (e.g., `src/main/**/*.ts`) — rejected; would silence genuinely orphaned files (violates FR-004).

## R-003: Shape of the `knip.json` config

**Decision**: Minimal JSON document with a top-level `$schema` pointer for editor hints, a `workspaces` map keyed by workspace path, and an `entry` array per workspace. No `ignore`, `ignoreDependencies`, or `project` overrides added in this feature.

**Illustrative shape** (normative version in [contracts/knip-config.schema.json](./contracts/knip-config.schema.json)):
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
- The `$schema` link gives editors (VS Code) autocomplete and validation without any project-level dependency. It pins to a major version (knip 5.x) to guard against breaking schema changes applied retroactively.
- Scoping via `workspaces["apps/loader"]` (rather than a global `entry`) means other packages are untouched — directly enforcing FR-005.
- No `ignore` patterns added — doing so would risk hiding genuinely orphaned files (violates FR-004 / FR-008).

**Alternatives considered**:
- Add `project` glob to restrict which files knip considers — not needed; defaults match.
- Add `ignoreDependencies` — out of scope; would violate FR-005.

## R-004: `updater.ts` — genuine orphan; resolution

**Decision**: **Delete** `apps/loader/src/main/updater.ts` as part of this feature. Do NOT add it to any knip ignore list.

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
| `main/types/ipc.ts` | ✅ | `ipc/jsonrpc.ts`, `ipc/stac.ts:12` |
| `main/updater.ts` | ❌ **GENUINE ORPHAN** | No inbound imports. Contains a commented-out `// import { autoUpdater } from 'electron-updater';`. No call sites. |

**Rationale for deletion (not wire-up)**:
- Wiring up auto-update would require adding `electron-updater` as a dependency, configuring signing keys, and selecting an update server. All three are substantial decisions that fit their own feature, not #202.
- Deletion is a one-line change with zero risk: the file is not imported anywhere, so no call site breaks. If auto-update is later needed, the file can be reconstructed from git history.
- Per `/speckit.review` Issue 4, the user explicitly chose "include fix in this task" and "delete it."

**Implication for success criteria**:
- Spec SC-001 already reads "reports zero files … as unused (baseline before change: twelve files)" — consistent with deletion. The prior plan's "12 → 1" framing was superseded by this decision.
- Quickstart step 3 expected count is `0` (not `1`).
- Verification record § 4 is "No genuine orphans remain."

**Alternatives considered**:
- Silence `updater.ts` via `ignore` pattern — rejected; violates FR-004 and FR-008.
- Wire up `electron-updater` — rejected as out of scope for this feature (would add a dep + signing + server decisions).
- Leave the file and flag it in the next maintainer's knip output — rejected per `/speckit.review` Issue 4 ("include fix in this task").

## R-005: `knip` — pinned dev dependency + CI gate (**SUPERSEDED UPDATE**)

**Decision**: Add `knip` to the root `devDependencies`, pinned to a specific 5.x version. Invoke via `pnpm exec knip` in a new `task knip` target. Wire `task knip` into `task verify` (developer workflow) and add a "Run knip" step to `.github/workflows/ci.yml` after the existing "Run linting" step.

**Supersedes**: the prior R-005 (`pnpm dlx knip`, no dep, no CI gate). Prior reasoning was "knip is a periodic ad-hoc scan; no dep needed." `/speckit.review` Issue 3B changed the feature's scope to include a CI gate, which flips every premise of the prior reasoning.

**Rationale**:
- **Article I.4 (reproducibility)** and **Article IX.2 (pinned versions)** both require pinning any tool whose output CI depends on. `pnpm dlx` fetches an unpinned version on every run, silently exposing the project to knip's semver changes.
- **Cost of `dlx` in CI**: every run performs a fresh network fetch of knip (~10s overhead). Over a year of ~500 CI runs that's meaningful, and it introduces a network dependency knip-scan doesn't otherwise need.
- **Honest dependency posture**: if CI enforces knip's output, we depend on knip. Declaring the dep matches reality (Article IX.1).
- **Local + CI parity**: `task knip` works identically locally and in CI, so a developer pre-flighting `task verify` before pushing gets the same signal CI will give.

**Implementation shape**:
1. Root `package.json`: `"devDependencies": { "knip": "^5.x.y" }` (pick a specific 5.x version current at implementation time; record it in the verification record).
2. `Taskfile.yml` new target:
   ```yaml
   knip:
     desc: "Run knip — fail if any non-declared unused files are detected"
     deps: [install]
     cmds:
       - pnpm exec knip
   ```
3. `Taskfile.yml` — add `task: knip` to `task verify`'s cmds (keeps parity between local pre-flight and CI).
4. `.github/workflows/ci.yml` — add step `- name: Run knip\n  run: task knip` after "Run linting."

**Alternatives considered**:
- **`pnpm dlx knip` (old R-005 position)** — rejected; fails Article I.4 and Article IX.2 once knip is a CI gate.
- **Install via `pnpm --filter <root> add -D knip` per CI run (ephemeral)** — rejected; just a longer `dlx`.
- **Defer CI gate to a separate feature** — would avoid the dep here, but that feature would add the exact same dep; splitting the PR buys nothing.

## R-006: How to verify the configuration works locally

**Decision**: During implementation, run `pnpm exec knip` twice — once on the pre-change commit (baseline) and once on the post-change commit — and diff the two reports. Capture both in `specs/201-knip-loader-config/evidence/verification-record.md`. Smoke-test the loader build via `pnpm --filter debrief-loader build:main`.

**Rationale**:
- SC-001 and SC-002 are both report-diff assertions. Direct before/after capture is the cheapest, most precise verification.
- Records the exact verification a future maintainer would run, doubling as a reproducible audit artefact (FR-007).
- Once CI enforces the gate, this manual verification becomes a one-time setup step rather than a recurring obligation.

## R-007: Coordination with backlog item #199

**Decision**: Document the coordination requirement here and surface it in the verification record. No proactive config change.

**Situation**:
- Item #199 (also approved) wants to add `ignore: ["specs/**"]` to the same `knip.json`, to suppress speckit contract `.ts` files that knip flags as unused.
- This feature's [contracts/knip-config.schema.json](./contracts/knip-config.schema.json) explicitly **rejects** an `ignore` key at the top level via `not: { anyOf: [{ required: ["ignore"] }] }`.
- The rejection exists to prevent a future PR from silencing legitimate findings via broad globs instead of proper entry declarations.

**Coordination message for the #199 implementer** (also recorded in the PR description when #202 lands):

> Feature #202 (knip config for loader) introduces a root-level `knip.json` with a contract schema at `specs/201-knip-loader-config/contracts/knip-config.schema.json`. That contract deliberately rejects a top-level `ignore` key to prevent broad silencing.
>
> When #199 lands its `ignore: ["specs/**"]` rule, the contract's `ajv validate` step (quickstart.md step 2) will fail against the new config. This is by design.
>
> Recommended path: relax #202's contract schema in the same PR as #199 by changing the `not: anyOf[...]` block to allow `ignore` with a tight enum whitelist (e.g., `enum: ["specs/**"]`). Document the schema change in #199's research.md. The `knip.json` itself is extended by adding a top-level `"ignore": ["specs/**"]` alongside the `workspaces` map.
>
> Alternative: declare a separate `specs/<199-dir>/contracts/knip-config.schema.json` that supersedes this one. Valid but overkill for a single-key addition.

**Why this matters now**: flagging the coordination here prevents the #199 author from re-deriving the rejection reasoning. Cost: one subsection in research.md. Benefit: one fewer surprise in the next PR.

## R-008: Task-runner target naming + placement

**Decision**: Name the new Taskfile target `knip` (not `lint:knip` or `check:unused`). Add it to `task verify` sequentially after `task test`.

**Rationale**:
- The `Taskfile.yml` convention pairs top-level targets with single-word concerns (`lint`, `typecheck`, `test`, `build`). `knip` fits that pattern; nesting it under `lint:*` would imply it's a lint sub-mode, which conflates two tools with different failure modes (ruff/ESLint style violations vs. reachability findings).
- Placing `task knip` at the end of `task verify`'s `cmds` list (after `task test`) keeps the existing lint → typecheck → test ordering intact and adds the new concern as an appended gate. Any dev running `task verify` before pushing gets the same gate CI will run.
- Keeping the target at the top level makes it composable: future features (e.g., "pin a second package's entries") add a workspace to `knip.json` and gain CI coverage automatically.

**Alternatives considered**:
- `lint:knip` — rejected; conflates concerns.
- `check:unused` — rejected; less discoverable and hides the specific tool.
- Placement in `task lint` — rejected; `task lint` runs in the `deps: [install, build]` graph including a build step, which is already slow. Knip doesn't need the build; keeping it separate avoids coupling.

## Summary of Resolved Unknowns

All spec NEEDS CLARIFICATION markers were resolved at spec-authoring time — none carried forward into this plan. Research decisions R-001 through R-008 resolve the implementation "how" without changing the spec's "what" (modulo two stale Assumptions called out in plan.md's "Required Spec Edits" section, which flip to consistent with the expanded scope).
