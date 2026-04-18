# Usage Example — `task knip`

This walkthrough shows how to run `task knip` locally, interpret its
output, and what to do when it fails. Pair with
[`quickstart.md`](../quickstart.md) for the full verification procedure.

## 1. Prerequisites

- Repo cloned and on a commit containing this feature (`201-knip-loader-config`).
- Dev dependencies installed: `task install` (installs pinned `knip@^5`).

## 2. Run the gate

```sh
task knip
```

Under the hood this runs:

```sh
pnpm exec knip -W apps/loader --reporter json --no-exit-code > /tmp/knip.json
```

…then checks the resulting `files` array for any path starting with
`apps/loader/src/main/`. The gate passes iff that set is empty.

### Clean pass

```
task: [install] uv sync
task: [install] pnpm install
task: [knip] ...
task knip: PASS — zero unused files under apps/loader/src/main/.
```

**Exit 0** — no regression. Safe to push.

### Failure (orphan detected)

```
task knip: FAIL — 1 file(s) under apps/loader/src/main/ flagged as unused:
apps/loader/src/main/some_new_file.ts

Either import the file from a declared entry (see knip.json) or delete it.
```

**Exit 1** — CI will fail on this.

## 3. Failure modes and remedies

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `some_new_file.ts` flagged; you just created it | You wrote a new main-process module but nothing imports it yet | Import it from an entry-reachable file (typically `main/index.ts` for a new IPC handler), or extend the feature that needs it so the import lands in the same PR |
| `some_existing_file.ts` flagged; you refactored out its last caller | The file is now a genuine orphan | Delete it (preferred) or restore the call site if the removal was a mistake |
| A file *moved* gets flagged even though its old path was reachable | The entry paths in `knip.json` haven't been updated | If the new path IS an entry, update `knip.json`'s `workspaces["apps/loader"].entry` to match — and validate with `npx -y ajv-cli@5 validate -s specs/201-knip-loader-config/contracts/knip-config.schema.json -d knip.json` |
| Entire gate crashes with a `Cannot find module` or `import.meta` error | An unrelated workspace's config file is breaking knip's jiti loader | Out of scope for this feature — see `evidence/verification-record.md` §1 for the pre-existing `apps/spec-navigator/playwright.config.ts` exclusion note |

## 4. What NOT to do

- ❌ **Don't add an `ignore` pattern to `knip.json`.** The contract schema
  at `contracts/knip-config.schema.json` deliberately rejects the `ignore`
  key (see research.md R-003, R-007). Silencing via `ignore` defeats the
  whole point of this feature — it converts real findings back into noise.
- ❌ **Don't add the file to the `entry` list unless it is genuinely a
  runtime entry.** The entry list should only contain the three declared
  Electron entry points (main, preload, renderer). Anything else belongs
  in an existing import chain.
- ❌ **Don't bypass the gate with `task knip || true` in CI.** If the gate
  fires, something in the loader's main tree is genuinely unreachable.
  Either fix the reachability or delete the file.

## 5. Related commands

```sh
# Full knip output for context (goes beyond just the main/ gate assertion):
pnpm exec knip -W apps/loader --reporter compact

# Validate the config against the feature's contract:
npx -y ajv-cli@5 validate \
  -s specs/201-knip-loader-config/contracts/knip-config.schema.json \
  -d knip.json

# Pinned knip version:
pnpm exec knip --version
# => 5.88.1
```
