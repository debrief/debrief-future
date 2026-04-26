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

- **2026-04-26** — `pnpm install` / `uv sync` 403 in Claude Code on the web sessions
  - **Symptom:** `curl https://registry.npmjs.org/pnpm` returns `HTTP/2 403` with `x-deny-reason: host_not_allowed`; same for `pypi.org`, `api.github.com`, `playwright.azureedge.net`. `pnpm install`, `uv sync`, `task verify` all fail. Local desktop CLI is unaffected.
  - **Cause:** Not a global Anthropic regression. Claude Code on the web has a per-cloud-environment **Network access** setting (None / Trusted / Full); this repo's environment was on a restrictive `custom` mode that excluded package registries.
  - **Fix:** At `claude.ai/code` → environment settings → **Network access**, set to **Trusted** (allows package registries) or **Full**. Setting applies to **freshly-provisioned VMs only** — start a new session after toggling, the running session keeps the old policy.
  - **Prevention:** New cloud envs default to **Trusted**, which already allows npm/PyPI. Avoid setting to None or a narrow custom allowlist unless you genuinely need offline-only.
  - **Reference:** `docs/project_notes/key_facts.md` → "Claude Code on the Web: Network Access" for the full table, the verification curl, the git-proxy operational nugget, and the upstream UX-bug tracker ([#10223](https://github.com/anthropics/claude-code/issues/10223)).

- **2026-04-21** — `TimeScrubber` prop shape trap: single `timeExtent`, not separate `data*`/`scrub*` pairs
  - **Cause:** `#217` plan.md R2 assumed `TimeScrubber` accepted separate `dataStart`/`dataEnd` + `start`/`end` pairs, so an "outer track with a narrowed handle" scrub-lock affordance would fall out. Actual prop shape is a single `timeExtent: TimeExtent`. The extension ↔ webview `updateTimeExtent` message *does* carry both pairs (`apps/vscode/src/views/timeRangeView.ts:125-131`), but the scrubber visually clamps to whichever `start`/`end` pair it receives.
  - **Fix:** The extension-side override via `TimeRangeViewProvider.setScrubbableRange(start, end)` works as designed — narrowing `start`/`end` in the outbound message shrinks the scrubber's clickable track, enforcing FR-PLAY-012. UX compromise: scrubber visually shrinks to the Scene window rather than showing the full data range with a narrowed handle.
  - **Prevention:** If a future slice needs the "full range + narrowed handle" visual affordance, `TimeScrubber` would need to accept both pairs as separate props — the extension side already has the data.
  - **Evidence:** `specs/217-storyboarding-playback/evidence/test-summary.md`

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
