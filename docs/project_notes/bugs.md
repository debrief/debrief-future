# Bug Log

Bug log with dates, solutions, and prevention notes. Keep entries brief and chronological.

## Format

Each bug entry should include:
- Date (YYYY-MM-DD)
- Brief description of the bug/issue
- Solution or fix applied
- Any prevention notes (optional)
- Evidence (optional): link to `specs/[feature]/evidence/test-summary.md` that proves the fix works

Use bullet lists for simplicity. Older entries can be manually removed when they become irrelevant.

---

<!-- Add new entries below this line -->

- **2026-01-30** — Tool execution failed: `Feature not found: layer-*` when result layer selected
  - **Cause:** `resolveFeatures()` in `calcService.ts` only searched tracks and locations, not result layers
  - **Fix:** Added result layer lookup via `panel.getResultLayers()`, expands contained features with `kind: 'result'` metadata. Added `getFeatureKind()` returning `'RESULT'` for result layer IDs.
  - **Files:** `calcService.ts:434-490`, `mapPanel.ts:470-474`

- **2026-01-30** — `area-summary` offered for track selections, failed with context type mismatch
  - **Cause:** `fetchToolsFromMcp()` mapped `ContextType.REGION` to `min: 0, max: 0` requirements, trivially passing for any selection
  - **Fix:** REGION tools now get `{kind: "REGION", min: 1}` requirement
  - **Files:** `calcService.ts:404-416`

- **2026-01-30** — `track-stats` offered for track+result selection, failed with `'single', got 'multi'`
  - **Cause:** `checkRequirements()` only validated listed kinds, ignored extra kinds in selection
  - **Fix:** Closed-world matching — reject if selection contains kinds not in the tool's requirements
  - **Files:** `tool.ts:72-92`
  - **Prevention:** ADR-005 — all tool matching is now closed-world
