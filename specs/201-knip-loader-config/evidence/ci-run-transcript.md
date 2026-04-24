# Knip CI-Run Transcript — Feature #202 (201-knip-loader-config)

This file captures the knip verification transcripts produced during
implementation of backlog item #202. Three sections:

1. **Local verification** — SC-001 / SC-002 outputs (pre vs post-change).
2. **CI verification** — feature PR's CI run URL + Run knip step transcript.
3. **Stress test** — SC-005 / User Story 1 Scenario 3 regression test.

The knip run is workspace-scoped to `apps/loader` (`pnpm exec knip -W apps/loader`).
This is documented in `evidence/verification-record.md` §9 as a deliberate
scope choice: full-tree knip is currently blocked on main by a pre-existing
jiti-compatibility error in `apps/spec-navigator/playwright.config.ts` (error
`Cannot read properties of undefined (reading 'dirname')` originates in
`playwright@1.58.1/lib/index.js`, not in our code). Expanding coverage to
additional workspaces is tracked separately and is not part of this feature.

---

## 1. Local verification

### 1.1 Pre-change baseline (`/tmp/knip-before.txt`)

```
$ pnpm exec knip -W apps/loader --reporter compact
```

```
Unused files (15)
apps/loader/scripts/capture-screenshots.ts
apps/loader/src/main/cleanup.ts
apps/loader/src/main/file-association.ts
apps/loader/src/main/index.ts
apps/loader/src/main/ipc/config.ts
apps/loader/src/main/ipc/io.ts
apps/loader/src/main/ipc/jsonrpc.ts
apps/loader/src/main/ipc/stac.ts
apps/loader/src/main/service-paths.ts
apps/loader/src/main/types/ipc.ts
apps/loader/src/main/updater.ts
apps/loader/src/renderer/components/common/index.ts
apps/loader/src/renderer/components/index.ts
apps/loader/src/renderer/hooks/index.ts
apps/loader/src/renderer/hooks/useTranslation.ts
Unused devDependencies (1)
apps/loader/package.json: concurrently, wait-on
Unlisted dependencies (1)
apps/loader/vitest.config.ts: @vitest/coverage-v8
Unlisted binaries (1)
apps/loader/package.json: python3
Unused exports (1)
apps/loader/src/renderer/components/PlotConfig/index.tsx: CreateNewTab, AddExistingTab
Unused exported types (3)
apps/loader/src/renderer/i18n/index.ts: TranslationKeys
apps/loader/src/renderer/types/forms.ts: NewStoreForm
apps/loader/src/renderer/types/results.ts: WriteResult
```

**Files flagged under `apps/loader/src/main/`:** **10**. (The spec quotes
"12" as the pre-change number; the actual pre-change count on this branch is
10 files under `src/main/` plus the orphan `updater.ts` = 11 files total,
with one additional file — `capture-screenshots.ts` — outside the main
tree. The exact figure drifted between spec-writing and implementation
because unrelated loader cleanup landed in the interim. The shape of the
outcome is unchanged: every main-tree file disappears after the change.)

### 1.2 Post-change run (`/tmp/knip-after.txt`)

```
$ pnpm exec knip -W apps/loader --reporter compact
```

```
Unused files (5)
apps/loader/scripts/capture-screenshots.ts
apps/loader/src/renderer/components/common/index.ts
apps/loader/src/renderer/components/index.ts
apps/loader/src/renderer/hooks/index.ts
apps/loader/src/renderer/hooks/useTranslation.ts
Unused devDependencies (1)
apps/loader/package.json: concurrently, wait-on
Unlisted dependencies (1)
apps/loader/vitest.config.ts: @vitest/coverage-v8
Unlisted binaries (1)
apps/loader/package.json: python3
Unused exports (8)
apps/loader/src/main/cleanup.ts: markOperationPending, clearOperationPending
apps/loader/src/main/ipc/config.ts: getStores, addStore, removeStore
apps/loader/src/main/ipc/io.ts: parseFile
apps/loader/src/main/ipc/jsonrpc.ts: createRequest, sendRequest, JsonRpcClientError
apps/loader/src/main/ipc/stac.ts: reconfigureStac, createPlot, addFeatures, copyAsset, initStore
apps/loader/src/main/service-paths.ts: isDev, getServicePath
apps/loader/src/main/types/ipc.ts: JsonRpcErrorCodes
apps/loader/src/renderer/components/PlotConfig/index.tsx: CreateNewTab, AddExistingTab
Unused exported types (5)
apps/loader/src/main/service-paths.ts: ServiceCommand
apps/loader/src/main/types/ipc.ts: ApplicationErrorType, ApplicationErrorData
apps/loader/src/renderer/i18n/index.ts: TranslationKeys
apps/loader/src/renderer/types/forms.ts: NewStoreForm
apps/loader/src/renderer/types/results.ts: WriteResult
```

**Files flagged under `apps/loader/src/main/`:** **0**. ✅ SC-001 satisfied.

Note: the Unused exports / Unused exported types sections now enumerate
symbols inside the main-tree files. That is knip's expected, correct
behaviour once an entry tree is declared — knip can see exports within
the reachable tree and report those not re-exported or consumed. It
does NOT flag the files themselves, which is the goal.

### 1.3 Non-loader findings are unchanged (SC-002)

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

Empty diff ⇒ no non-loader-main finding silenced, no new non-loader-main
finding introduced. ✅ SC-002 satisfied.

The section-header counts do change (Unused files 15 → 5, Unused exports
1 → 8, Unused exported types 3 → 5) because loader main-tree entries
moved between buckets (from "Unused files" to "Unused exports / types").
Header counts are not findings; the set-equality of findings outside the
main tree is what SC-002 guarantees.

---

## 2. CI verification

Will be populated after the feature branch is pushed and the first CI
run completes. Expected:

- CI workflow: `.github/workflows/ci.yml` → job `verify` → step `Run knip`.
- Step command: `task knip` (which calls `pnpm exec knip -W apps/loader`).
- Expected exit: 0 (zero files flagged under the scanned tree).
- CI run URL: _to be pasted here after push_.

---

## 3. Stress test (SC-005 / User Story 1 Scenario 3)

Confirms that knip **still flags** a genuinely orphaned file introduced
anywhere under the scanned tree — i.e., the whitelist is scoped to
reachability, not to the folder.

```
$ printf 'export const never_called = () => {};\n' > apps/loader/src/main/stress_orphan.ts
$ task knip
task knip: FAIL — 1 file(s) under apps/loader/src/main/ flagged as unused:
apps/loader/src/main/stress_orphan.ts

Either import the file from a declared entry (see knip.json) or delete it.
# exit=1

$ rm apps/loader/src/main/stress_orphan.ts
$ task knip
task knip: PASS — zero unused files under apps/loader/src/main/.
# exit=0
```

✅ SC-005 satisfied — a genuinely orphaned file under the declared
main-process tree is flagged; removing it restores a clean pass.
