# Annotated `knip.json`

Copied from `/knip.json` at commit `1a47cf1`. Each field is annotated with the
decision that governs it.

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

## Why `$schema`

Pins editors (VS Code, IntelliJ) to knip's published JSON Schema for autocompletion
and validation — zero cost, no project-level dep. The `@5` tag intentionally locks
the schema to major version 5 so a silent knip schema-shape change (e.g.,
renaming `workspaces` to `packages` in knip 6) surfaces as an editor warning
rather than a silent config drift.

The feature's **contract schema** at
`specs/201-knip-loader-config/contracts/knip-config.schema.json` enforces the
`^https://unpkg\.com/knip@5` pattern via `ajv-cli`, so a PR that updates the
`$schema` to e.g. `knip@6` without re-writing the feature's contract will fail
validation (see quickstart.md Step 2).

## Why three entries (and only three)

Knip treats each listed path as a "reachable root"; everything transitively
imported from that root is considered used. The Electron loader has three such
roots — one per process the packager boots:

1. **`src/main/index.ts`** — the main-process entry (Electron's first script).
2. **`src/preload/index.ts`** — the preload script (`webPreferences.preload`).
3. **`src/main.tsx`** — the renderer entry (referenced from `index.html` via
   Vite).

These map one-to-one to the three files the loader's packaging pipeline boots
at runtime. Any other file flagged by knip under `apps/loader/src/main/` is by
definition unreachable — and should be deleted or re-connected, not silenced.

The contract schema enforces `minItems: 3, maxItems: 3` and an `enum` on the
accepted paths — any PR that tries to add a fourth entry will fail contract
validation, forcing a fresh Constitution Check.

## Why no `ignore`

The contract schema explicitly rejects an `ignore` key:

```json
"not": {
  "anyOf": [
    { "required": ["ignore"] },
    { "required": ["ignoreDependencies"] }
  ]
}
```

`ignore` patterns silence findings by *path*, not by *reachability* — that's
the opposite of what this feature is trying to achieve. If a file is a
genuine orphan, deleting it (like we did with `updater.ts`) keeps the report
honest. See `research.md` R-003 and R-007 for the coordination note on future
features that may legitimately want to relax this (e.g. backlog #199).

## Why no per-workspace `project` override

Not needed — knip's default `project` globs match every file under
`apps/loader/`, which is what we want. Overriding would narrow the scan (risk:
missing genuine orphans) or broaden it (risk: pulling in non-loader files).

## Why workspace-scoped, not global

The `workspaces["apps/loader"]` key scopes all declarations to that one
package. Other packages in the monorepo are untouched — enforcing FR-005
("findings for packages OTHER than the loader MUST be unchanged"). The
proof is the empty diff captured in `evidence/ci-run-transcript.md` §1.3.

## What the contract schema enforces

| Rule | Why |
|------|-----|
| `$schema` is required, pinned to knip@5 | Surfaces schema shape drift at review time |
| `workspaces` is required, only `apps/loader` key is allowed | Future features must amend the contract to add coverage — prevents silent scope creep |
| Exactly 3 entries, each from a fixed enum | Prevents a PR from sneaking in a fourth "entry" that isn't actually an Electron entry |
| `ignore` / `ignoreDependencies` rejected | Forces genuine orphans to be fixed, not silenced |
