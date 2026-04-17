# Quickstart: Properties Panel (#191)

How a developer exercises the Properties Panel end-to-end once Phase 1 tasks ship. Reviewer-facing manual test script.

## Prerequisites

```bash
cd /Users/ian/git/worktrees/193-properties-panel
pnpm install
uv sync --all-packages
task generate      # regenerate schemas after the LinkML additions
```

## Build & launch

```bash
pnpm --filter @debrief/vscode run build
code --extensionDevelopmentPath=$(pwd)/apps/vscode preview/workspace
```

Or via the web shell:

```bash
pnpm --filter @debrief/web-shell run dev
# open http://localhost:3001
```

## Scenario 1 — Per-commit persistence on an open plot

1. Open a STAC item from `preview/workspace/samples/local-store/` in the plot editor.
2. In the ActivityPanel on the right, expand the **Properties** section (the new 4th section).
3. Focus the `debrief:tags` chip input, add a tag, and **press Enter**. Observe:
   - The chip appears in the panel.
   - Within ~100 ms, `item.json` on disk contains the new tag in `properties["debrief:tags"]` (verify with `cat preview/workspace/samples/local-store/<collection>/<item>/item.json`).
   - `item.json` now has `properties["debrief:provenance_log"]` with one new entry: `tool: "debrief.propertiesPanel"`, `fields: ["debrief:tags"]`, `source: "user"`.
4. Type more into the `title` field but **do NOT blur yet**. `item.json` is unchanged — keystrokes don't commit.
5. Tab out of the title field (blur). Observe:
   - `item.json.properties.title` now holds the new value.
   - A second `debrief:provenance_log` entry is appended: `fields: ["title"]`.
6. Close and reopen the plot. Both values persist.

## Scenario 2 — Per-commit persistence from StacBrowser (no plot open)

1. Close all open plots.
2. Open the STAC Browser view. Select an item in the list.
3. On the right-hand split pane, observe `ThumbnailPreview` on top and a new **Properties** section below, separated by a drag handle.
4. Edit `debrief:tags` → Enter. Observe the same per-commit disk write as Scenario 1.
5. Reload the browser (or reopen the item). The value survives.

## Scenario 3 — Auto-derived override survives re-derivation

1. Open a plot with track features that have timestamps. Note the auto-derived `start_datetime` in the Properties section — it has an **"auto-derived"** chip.
2. Commit a manual override by editing `start_datetime` to a hand-picked value and blurring. Observe:
   - `item.json.properties["debrief:overrides"]` now includes `"start_datetime"`.
   - Chip changes to **"override"**.
3. Trigger any action that normally re-runs `updateTemporalMetadata` (e.g. reload features via `debrief.reloadFeatures`). Observe:
   - `item.json.properties.start_datetime` is unchanged — your value survived.
   - `end_datetime` and `datetime` (not overridden) still update as before.

## Scenario 4 — Stale-edit detection

1. Open a plot. Open the Properties section. Note current `debrief:tags`.
2. In a separate terminal, edit `item.json` directly (e.g. `sed -i '' 's/old-tag/hacked-tag/' item.json`). Save.
3. Back in the Properties Panel, commit a different tag change. Observe:
   - An inline banner appears: "item.json was modified externally — please reload".
   - The form reloads from disk (`hacked-tag` visible; your uncommitted edit preserved in the input so you can re-apply if you want).
   - No write occurred to disk; no provenance entry was appended.

## Scenario 5 — Schema extensibility (SC-003)

1. Add a test-only field to `shared/schemas/src/linkml/stac-extension.yaml` inside `StacExtensionProperties`:

   ```yaml
   debrief:custom_note:
     range: string
     description: "Free-text note for stakeholder review"
     required: false
   ```

2. Run `task generate`.
3. Rebuild the extension. Open a plot.
4. Without changing `PropertiesForm.tsx`, a new input for `debrief:custom_note` appears in the Properties section. Edit, blur, verify it persists.
5. Revert the LinkML change before committing.

(CI automates this via `tests/fixtures/properties-panel/evolving-schema.yaml` — you shouldn't need to run this manually in day-to-day work, but the script above is exactly what the CI gate does.)

## Scenario 6 — Provenance log rotation

1. Open a plot with a high-churn edit history (or synthesise by calling `updateItemMetadata` in a loop via a test script).
2. Once the 501st commit is recorded, observe:
   - `item.json.properties["debrief:provenance_log"]` still has 500 entries (newest retained).
   - A new file `provenance_log_archive.jsonl` appears in the item directory with the oldest entry in JSONL format.
3. Subsequent commits append to the archive (newline-delimited).

## Running the test suites

```bash
# Lint + typecheck + unit tests
task verify

# Storybook
pnpm --filter @debrief/components run storybook

# Storybook E2E (Playwright) — includes offline-invariant harness
pnpm --filter @debrief/components run test:e2e

# Webview E2E (code-server round-trip for Scenarios 1, 2, 3, 4)
cd apps/web-shell && node run-playwright.mjs

# Schema-evolution CI gate (Scenario 5 automated)
pnpm --filter @debrief/components run test:schema-evolution
```

## Offline verification (SC-005)

The vitest offline harness (Decision 10) runs automatically in the test suite — `fetch` and `XMLHttpRequest` throw for the duration of PropertiesForm + widget + stacService tests. If anyone adds a network call, the CI build fails.

For manual verification:

```bash
# Disable network on your machine, then repeat Scenario 1 end-to-end.
# All steps MUST succeed with no error banner.
```

## Expected on-disk artefact shape

After Scenario 1, `item.json`:

```jsonc
{
  "stac_version": "1.0.0",
  "type": "Feature",
  "id": "track-2026-01-15",
  "properties": {
    "title": "Nelson patrol (Apr 15)",                // ← edited
    "start_datetime": "2026-01-15T08:00:00Z",
    "end_datetime":   "2026-01-15T12:00:00Z",
    "datetime":       null,
    "debrief:tags":        ["exercise-alpha", "reviewed"],    // ← edited
    "debrief:platforms":   [...],
    "debrief:feature_tags":[...],
    "debrief:overrides":      ["debrief:tags", "title"],      // ← new
    "debrief:provenance_log": [                                // ← new
      {
        "activity_id": "01HWABC...",
        "timestamp":   "2026-04-17T09:15:00Z",
        "tool":        "debrief.propertiesPanel",
        "method":      "properties-panel@1.0.0",
        "fields":      ["debrief:tags"],
        "source":      "user"
      },
      {
        "activity_id": "01HWABD...",
        "timestamp":   "2026-04-17T09:15:30Z",
        "tool":        "debrief.propertiesPanel",
        "method":      "properties-panel@1.0.0",
        "fields":      ["title"],
        "source":      "user"
      }
    ]
  },
  "assets": { ... },
  "links":  [ ... ]
}
```

Feature-level GeoJSON is unchanged — Properties Panel only edits item-level metadata.
