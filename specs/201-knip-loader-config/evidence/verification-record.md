---
feature: 201-knip-loader-config
captured_at: 2026-04-18T16:17:37Z
git_sha: 1a47cf1
knip_version: 5.88.1
scanner: knip
---

# Verification Record — Feature #202 (Knip Config for Electron Loader)

This record satisfies **FR-007** and makes **SC-006** verifiable: a future
maintainer can audit the whitelist's premise in under five minutes without
re-deriving the reachability chain.

## §1 Scope

Adding a minimum-scope `knip.json` declaring the Electron loader's three entry
points, deleting the one genuine orphan (`updater.ts`), and wiring `task knip`
into the local dev loop (`task verify`) and CI (`.github/workflows/ci.yml`).

Knip coverage is **workspace-scoped to `apps/loader`** (`pnpm exec knip -W apps/loader`).
Full-tree knip is currently blocked by a pre-existing jiti compatibility error
in `apps/spec-navigator/playwright.config.ts` (`Cannot read properties of
undefined (reading 'dirname')`, originating in `playwright@1.58.1/lib/index.js`).
Expanding coverage to additional workspaces is tracked as future work and is
explicitly not part of this feature's minimum scope (FR-008).

## §2 Declared entry paths

From `knip.json` → `workspaces["apps/loader"].entry`:

1. `apps/loader/src/main/index.ts` — Electron main-process entry.
2. `apps/loader/src/preload/index.ts` — Electron preload entry (referenced by
   `webPreferences.preload` in `src/main/index.ts`).
3. `apps/loader/src/main.tsx` — Vite renderer entry (referenced by
   `vite.config.ts` / `index.html`).

## §3 Reachability table

Each file flagged by knip on the pre-change baseline under
`apps/loader/src/main/`, with its reachability verdict:

| File | Verdict | Reached via |
|------|---------|-------------|
| `main/index.ts` | ✅ Entry itself | declared in `knip.json` |
| `main/cleanup.ts` | ✅ Reachable | `main/index.ts` |
| `main/file-association.ts` | ✅ Reachable | `main/index.ts` |
| `main/service-paths.ts` | ✅ Reachable | `main/ipc/io.ts`, `main/ipc/stac.ts` |
| `main/types/ipc.ts` | ✅ Reachable | `main/ipc/jsonrpc.ts`, `main/ipc/stac.ts` |
| `main/ipc/config.ts` | ✅ Reachable | `main/index.ts` |
| `main/ipc/io.ts` | ✅ Reachable | `main/index.ts` |
| `main/ipc/jsonrpc.ts` | ✅ Reachable | `main/ipc/io.ts`, `main/ipc/stac.ts` |
| `main/ipc/stac.ts` | ✅ Reachable | `main/index.ts` |
| `main/updater.ts` | 🗑 **DELETED** | No inbound imports. Commented-out `electron-updater` import; no call sites. Deleted in this feature (see research.md R-004). |

Post-change knip confirmation: `jq '.files | map(select(startswith("apps/loader/src/main/")))' /tmp/knip.json` ⇒ `[]`.

## §4 "No genuine orphans remain"

After deleting `updater.ts`, zero files under `apps/loader/src/main/` are
unreachable from a declared entry. `task knip` exits 0 on the current tree
and would fail on any newly-introduced orphan (exercised in §9).

## §5 Pinned knip version

- **Package**: `knip`
- **Version installed**: `5.88.1` (via `pnpm add -Dw knip@^5`, resolved to the
  latest 5.x at capture time).
- **Invoked via**: `pnpm exec knip` (no `dlx` fetch). See research.md R-005 for
  the rationale behind pinning.

## §6 Build-smoke transcript

The loader's `typecheck` script passes once the workspace's `@debrief/utils`
package has been built:

```
$ pnpm --filter @debrief/utils build
> @debrief/utils@0.1.0 build
> tsc

$ pnpm --filter debrief-loader typecheck
> debrief-loader@0.1.0 typecheck
> tsc --noEmit
# (no output, exit 0)
```

This is the same pre-build-then-typecheck sequence `task verify` runs in CI
(lint → typecheck → test), so the loader's typecheck is green under the
standard pipeline.

The loader's standalone `build:main` script still fails on `main` at this
commit due to a pre-existing `rootDir` drift in `tsconfig.main.json` (not
introduced by this feature — reproduces on `main` with the feature stashed).
That script is not part of `task verify` or CI, so it does not block shipping
this feature; fixing it is out of scope and tracked separately.

**Implication for FR-009** (the "loader-is-dormant" edge case): the loader has
an active storybook CI job, an active typecheck under `pnpm -r typecheck`,
active source changes in git history, and clearly still-in-scope Electron main
source. FR-009 does not trigger — we proceed with the knip config as intended.

## §7 Pre/post knip counts

- **Pre-change**: 10 files under `apps/loader/src/main/` reported by
  `pnpm exec knip -W apps/loader --reporter compact`. (The spec quotes "12"; the
  actual count on this branch at implementation time is 10 `src/main/` files
  plus the orphan `updater.ts`. The shape of the outcome is unchanged.)
- **Post-change**: 0 files under `apps/loader/src/main/` reported.

Full transcripts are saved in `evidence/ci-run-transcript.md` §1.

✅ **SC-001 satisfied** — goal "zero files under the loader's main-process
source tree as unused" achieved.

## §8 Non-loader-unchanged diff

```
$ grep -vE '(^apps/loader/src/main/|: apps/loader/src/main/| apps/loader/src/main/)' /tmp/knip-before.txt \
    | grep -v "^Unused" | sort -u > /tmp/knip-before-nonloader.txt
$ grep -vE '(^apps/loader/src/main/|: apps/loader/src/main/| apps/loader/src/main/)' /tmp/knip-after.txt \
    | grep -v "^Unused" | sort -u > /tmp/knip-after-nonloader.txt
$ diff /tmp/knip-before-nonloader.txt /tmp/knip-after-nonloader.txt
(empty)
$ echo $?
0
```

Empty diff ⇒ no non-loader-main finding was silenced or introduced.

✅ **SC-002 satisfied** — non-loader-main findings are unchanged.

## §9 CI-gate exercised

### 9.1 Local stress test (exercised at implementation time)

```
$ printf 'export const never_called = () => {};\n' > apps/loader/src/main/stress_orphan.ts
$ task knip
task knip: FAIL — 1 file(s) under apps/loader/src/main/ flagged as unused:
apps/loader/src/main/stress_orphan.ts
# exit=1

$ rm apps/loader/src/main/stress_orphan.ts
$ task knip
task knip: PASS — zero unused files under apps/loader/src/main/.
# exit=0
```

✅ **SC-005 satisfied** — a genuine orphan introduced under the declared tree
is flagged; removing it restores a clean pass.

### 9.2 CI-run URL

Will be populated after the feature branch is pushed and the first CI run
completes. See `evidence/ci-run-transcript.md` §2 for the expected format.

---

**Audit note for future maintainers** (per SC-006): to re-verify this record
in under five minutes, run `pnpm exec knip -W apps/loader --reporter compact`
from a clean checkout at this commit and confirm the post-change output shows
zero files under `apps/loader/src/main/` in the "Unused files" section. If
the whitelist silently stops working (e.g., due to a knip upgrade), the new
CI gate in `.github/workflows/ci.yml` will fail the build, making the
regression obvious.
