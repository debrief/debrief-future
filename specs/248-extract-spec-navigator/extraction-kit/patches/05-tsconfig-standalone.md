# Patch 05 — Standalone tsconfig

## What

Replace `tsconfig.json`'s `"extends": "../../tsconfig.base.json"` with the inlined contents of the base config, plus the app-specific overrides that were already present.

## Why

The relative path points to a file that doesn't exist in the new repository. Without inlining, `tsc --noEmit` errors immediately. The base config is small and rarely changes, so inlining is a one-time cost.

## How

### Step 1 — Read the current configs

In a fresh clone of `debrief/debrief-future` at the same commit the subtree split was taken from:

```sh
cat tsconfig.base.json
cat apps/spec-navigator/tsconfig.json
```

### Step 2 — Merge

Produce a single `tsconfig.json` at the new repo root with:

- All `compilerOptions` from `tsconfig.base.json`,
- App-specific overrides from the original `apps/spec-navigator/tsconfig.json`,
- The `include`/`exclude` from the original.

**Required `compilerOptions`** (from the base — verify these are present in your merge):

```json
{
  "target": "ES2020",
  "lib": ["ES2020", "DOM", "DOM.Iterable"],
  "module": "ESNext",
  "moduleResolution": "Bundler",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "esModuleInterop": true,
  "resolveJsonModule": true,
  "isolatedModules": true,
  "noEmit": true,
  "jsx": "react-jsx",
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true
}
```

(Match the actual values in `tsconfig.base.json` at the time you take the split — these are illustrative.)

### Step 3 — Repeat for `tsconfig.node.json`

If the original `tsconfig.node.json` extends the base too, inline the same way.

### Step 4 — Verify

```sh
pnpm typecheck
```

Should run clean.

## Commit message

```
chore(tsconfig): standalone config; inline ../../tsconfig.base.json

Replaces the monorepo-relative extends path that doesn't resolve in
the standalone repo. No semantic compiler-option change; just the same
options written locally.
```

## Why this isn't a literal patch file

The base config in `debrief-future` evolves over time. By the time you run this kit, its content may have changed — a literal patch would be stale. The recipe is short enough that re-deriving the merge each run is cheaper than maintaining a versioned patch.
