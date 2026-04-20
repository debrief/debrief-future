# knip report — baseline (main) vs branch (199-code-quality-cleanup)

**Captured:** 2026-04-18
**knip version:** 5.88.1 (pinned in root `package.json` per FR-019)
**Baseline branch:** `main` @ `130a52c`
**Feature branch:** `claude/implement-speckit-199-RvXLY`

## Method

1. Checked out `main` into a clean worktree at `/tmp/main-baseline`.
2. Installed `knip@5.88.1` as a root devDependency on the baseline (matching the pin
   that the branch adds).
3. Wrote a transient `knip.json` on the baseline with the same `playwright: false`
   workaround the branch uses for `apps/spec-navigator/playwright.config.ts` (see
   note below) — but **without** `ignore: ["specs/**"]`. This isolates the effect of
   the new `specs/**` ignore rule.
4. Ran `pnpm exec knip > /tmp/knip-main.txt` on the baseline.
5. Ran `pnpm exec knip > /tmp/knip-branch.txt` on the feature branch.
6. Compared with `diff <(grep -v '^specs/' /tmp/knip-main.txt | sed 's/[[:space:]]*$//') <(grep -v '^specs/' /tmp/knip-branch.txt | sed 's/[[:space:]]*$//')`.

## Headline

| | Baseline (main) | Branch | Δ |
|---|---|---|---|
| `Unused files` count | 119 | 62 | **−57** (all from `specs/**`) |
| Files reported under `specs/**` | 57 | **0** | **SC-001 ✓** |

## Diff (non-`specs/**` findings filtered)

```text
2c2
< Unused files (119)
---
> Unused files (62)
638d637
< . (root)                  …ip.json  Add entry and/or refine project files in workspaces["."] (63 unused files)
641a641
> . (root)                  …ip.json  Add entry and/or refine project files in workspaces["."] (6 unused files)
```

The two non-`specs/**` lines that change are **count-summary lines** that derive
from the count of unused files. The set of actual non-`specs/**` findings
(file paths reported as unused) is byte-identical between main and the branch.
**SC-001 satisfied.**

## Reproducibility (FR-019, SC-009)

The branch pins `knip` exactly:

```json
"devDependencies": {
  "knip": "5.88.1"
}
```

`pnpm install` on a fresh clone now resolves to the same knip binary every time;
`pnpm dlx knip@latest` is no longer relied upon, closing the silent-drift gap
flagged by `/speckit.review` Issue 1.

## Configuration

`knip.json` (committed):

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "ignore": ["specs/**"],
  "workspaces": {
    "apps/spec-navigator": {
      "playwright": false
    }
  }
}
```

The `ignore` entry is the narrowest mechanism knip provides for excluding a path
prefix (FR-010).

The `apps/spec-navigator → playwright: false` stanza disables knip's auto-loaded
playwright plugin **only** for the spec-navigator workspace. This is a workaround
for a knip 5.x bug: the plugin tries to dynamically import the workspace's
`playwright.config.ts`, which uses
`fileURLToPath(import.meta.url)`, and knip's loader does not provide
`import.meta.url` to evaluated configs. Without this stanza, knip fails to start
(`Cannot read properties of undefined (reading 'dirname')`). The stanza is
applied identically on the baseline run so the comparison is fair, and is the
narrowest scope possible (one workspace, one plugin) per FR-010.

## Sample of silenced `specs/**` entries (baseline only)

```text
specs/001-shared-react-components/contracts/types.d.ts
specs/001-wire-file-actions/contracts/messages.ts
specs/025-time-controller/contracts/TimeController.d.ts
specs/030-temporal-track-rendering/contracts/temporal-track-api.ts
specs/039-wire-timecontroller-temporal-track/contracts/webview-messages.ts
specs/042-stac-catalog-overview-panel/contracts/messages.ts
…  (57 entries total — all silenced on the branch)
```
