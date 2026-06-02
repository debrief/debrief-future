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

- **2026-06-01** — Storyboard **Preview** button shows bare "Forbidden" under Heroku code-server (#273)
  - **Symptom:** In VS Code running under code-server on a Heroku review app, clicking the Storyboard panel's new **Preview** button opens a new browser tab that displays only `Forbidden`. URL is `https://<app>-pr-<n>.herokuapp.com/proxy/<port>/`.
  - **Cause (three stacked bugs, each exposed as the prior was fixed):**
    1. **Host allowlist 403** *(the visible "Forbidden")*. `BriefingPreviewServer` (the ephemeral loopback server, ADR-037 / C-B7) enforces a DNS-rebinding `Host` allowlist that only accepted `127.0.0.1[:<port>]`. Under code-server, `vscode.env.asExternalUri` rewrites the loopback URL to `…herokuapp.com/proxy/<port>/`, and the proxy forwards that request to `127.0.0.1:<port>` **preserving the public `Host` header** (code-server's `http-proxy` has no `changeOrigin`). The foreign `Host` failed the allowlist → `res.end('Forbidden')` (the exact plain-text body seen). The DNS-rebinding defence was correct for *local* VS Code but blind to the legitimate tunnel case.
    2. **Absolute `features` path (latent).** The launch URL used `?features=/features.geojson` (absolute). Even after fixing the 403, the renderer (served at `/proxy/<port>/`) would `fetch('/features.geojson')` against the **origin root**, escaping the proxy prefix and 404ing.
    3. **Dropped launch query → dev fixture.** With the 403 fixed, the renderer *loaded* but played the **dev-fixture** storyboard, not the active one. code-server's `asExternalUri` rewrite to `/proxy/<port>/` **drops the query string** (the original screenshot URL `…/proxy/38547/` showed no `?features` either), so the renderer saw no `?features`, fell through to empty inline slots, and dev-fixtured. (A *present-but-failed* fetch would show an error, not the fixture — confirming the query was simply absent.)
  - **Fix:**
    1. `previewStoryboard` now calls `server.trustExternalHost(externalUrl)` after `asExternalUri`; the server additionally allows that exact host (port-tolerant). Safe because in a tunnel the loopback is the *remote* host's and is reachable only via the authenticated tunnel — rebinding (which targets the *browser machine's* loopback) cannot reach it. A loopback `asExternalUri` result (local desktop VS Code) registers nothing, so the strict allowlist is unchanged. Loopback allowlist also broadened to `localhost`/`[::1]`.
    2. `getPreviewUrl()` now emits a **relative** `?features=features.geojson` so it resolves against the renderer's document URL under any path-prefix. (The zip path's `file://` `fetch('./features.geojson')` problem from #264 does **not** apply — live preview is served over http.)
    3. The preview server now **injects the features location into the served `index.html` as a global** (`window.__BRIEFING_PREVIEW_FEATURES__`); the renderer reads it (via `resolveFeaturesUrl`) when `?features` is absent. This is the proxy-proof hand-off — it does not depend on the query surviving. The relative `features.geojson` fetch then works because relative resource loading already succeeds through the proxy (the renderer's own JS/CSS assets load the same way).
  - **Prevention:** Any loopback server opened via `asExternalUri` + `openExternal` must (a) treat the rewritten host as legitimate, (b) hand off sibling resources via **relative** URLs (proxy path-prefixes are invisible to the app), and (c) **not rely on the launch query surviving** the rewrite — inject hand-off state into the served document instead. Covered by new unit tests: `briefingPreviewServer.test.ts` (tunnel-host accepted; foreign host still 403; features-global injected into `<head>`), `previewStoryboard.test.ts` (`trustExternalHost` called with the external URL), and `resolveFeaturesUrl.test.ts` (query → injected-global fallback). ADR-037 amended.

- **2026-05-19** — Process bug (recurring): feature posts shipped without screenshots, citing UI scope deferral
  - **Symptom:** `media/shipped-post.md` is created without image references; `evidence/screenshots/` is empty or missing; `opening-context.md` has hook image paths that point at non-existent files. The published blog post lands with broken image links or a prose placeholder where a captured frame should be. Confirmed in #263 (this commit) — 10 screenshots listed in `tasks.md`, 0 captured; opening-context references `04-mid-scrub.png` that was never produced.
  - **Cause:** When the assistant defers UI work for scope reasons, it conflates "UI components not built" with "no screenshots possible". In practice the screenshots listed in `tasks.md` come from Storybook stories and Playwright workflow specs — those *are* the producers. Skipping them is a separate, additive scope cut, not a consequence of deferring UI affordances. The assistant additionally rationalised that "Playwright doesn't run in cloud sessions" — which is false; the bundled `run-playwright.mjs` wrappers + `@sparticuz/chromium` work in cloud and the project's `CLAUDE.md` says so explicitly. The CLAUDE.md + speckit.implement.md callouts were both present and both ignored under context pressure.
  - **Fix:** Two-layer hard guard at PR creation time:
    1. **Audit script** at `.specify/scripts/bash/audit-evidence-screenshots.sh` — resolves the active feature, parses `tasks.md` for `evidence/screenshots/*.{png,gif,jpg,webp}` paths and `opening-context.md` for `![...](screenshots/...)` markdown image references, checks each file exists, exits 2 (with a structured stderr message listing missing files + the Playwright wrapper to run) if any are missing. Exit 0 if no active feature, no screenshots committed, or all present. Override: `SPECIFY_SKIP_SCREENSHOT_AUDIT=1` for the rare "no-images post" case.
    2. **PreToolUse hook** in `.claude/settings.json` matching `mcp__github__create_pull_request|mcp__github__update_pull_request` — same script, blocks at the tool boundary if the assistant skips step 7c of `/speckit.pr`.
    3. **`/speckit.pr` step 7c** is rewritten from a warning to a HARD BLOCKER that runs the audit and stops the workflow on failure.
  - **Prevention:** The choice is removed at the moment it matters. The override path requires explicitly removing the orphaned references from `opening-context.md` + `tasks.md` in the same commit, so a no-images post is a deliberate act, not an omission. The override flag's name (`SPECIFY_SKIP_SCREENSHOT_AUDIT`) makes the bypass audit-traceable in shell history.
  - **What this does NOT fix:** the assistant still has to *capture* the screenshots, not just remove the audit. The guard catches the omission at PR-creation time; the fix is to run the Playwright wrappers earlier in the workflow when the evidence section is being built. If a future session hits this audit, the correct response is "stop, run the wrapper, capture the file" — not "set the override and ship".
  - **Origin:** PR #638 (this PR) — shipped a 1600-line spec with zero screenshots; user flagged the omission as a recurring failure mode and asked where the knowledge should live.

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
