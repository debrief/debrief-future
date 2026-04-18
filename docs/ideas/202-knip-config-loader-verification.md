# Verify apps/loader electron entry + add knip config

## Problem
`pnpm dlx knip` flags 12 files under `apps/loader/src/main/**` as unused:
- `main/index.ts` (Electron main-process entry)
- `main/ipc/{config,io,jsonrpc,stac}.ts`
- `main/{cleanup,file-association,service-paths,types/ipc,updater}.ts`

These are almost certainly false positives — `main/index.ts` is the declared Electron main entry (via `package.json` `"main"` field and/or electron-builder config), and the IPC modules are reachable from it. knip doesn't trace electron-builder packaging config by default, so every run surfaces the same noise.

## Proposed Solution
1. Verify that `apps/loader/src/main/index.ts` is the canonical Electron entry:
   - Confirm `apps/loader/package.json` points to the built equivalent via `"main"` or equivalent electron-builder config
   - Confirm each `ipc/*.ts` module is imported (directly or via `require()`) from the entry or its reachable tree
   - Confirm loader builds cleanly and can be launched locally
2. Add a knip configuration (either top-level `knip.json` / `knip.ts`, or a `knip` stanza in the root `package.json`) that whitelists `apps/loader/src/main/index.ts` as an entry point so its reachable tree is no longer flagged.
3. If verification reveals that loader is genuinely dormant (no working build, no CI job, no planned ship date), escalate to a separate decision about whether to archive `apps/loader/` wholesale — but do *not* decide that here.

## Success Criteria
- `pnpm dlx knip` no longer flags files under `apps/loader/src/main/`
- `apps/loader` still builds (smoke test: `pnpm --filter <loader-package-name> build`) and launches
- knip config change is the minimum needed to whitelist the entry — no other packages silenced inadvertently

## Dependencies
None.

## Parallelisation
Fully parallel with #199, #200, #201, #206, E11, E12. Independent of LinkML items.

## Complexity
Low
