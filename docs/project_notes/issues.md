# Work Log

Work log with ticket IDs, descriptions, and URLs. Keep it simple - full details live in GitHub Issues.

## Format

Each entry should include:
- Date (YYYY-MM-DD)
- Ticket ID
- Brief description (1-2 lines)
- URL to ticket
- Status (completed, in-progress, blocked)
- Evidence (optional): link to `specs/[feature]/evidence/` directory with proof-of-work artifacts

---

<!-- Add new entries below this line -->

### 2026-04-24 - #191-vscode-nl-search: NL search in VS Code Catalog Overview
- **Status**: Completed (claude/implement-speckit-191-Jc7Uy, PR forthcoming)
- **Description**: Surface the NL → CQL2 pipeline (shipped in `apps/nl-demo` via #188/#189/#190) inside the VS Code Catalog Overview. Opt-in, default-off, API key in SecretStorage, seven-class failure banner matrix. Single canonical `LLMClient` contract returning `LiveOutcome` across browser + VS Code; `createPostMessageLLMClient` bridges the webview↔host boundary.
- **URL**: spec at [`specs/191-vscode-nl-search/spec.md`](../../specs/191-vscode-nl-search/spec.md)
- **Evidence**: [`specs/191-vscode-nl-search/evidence/`](../../specs/191-vscode-nl-search/evidence/) — test-summary, usage-example, sequence diagram, sc-004 failure matrix, config sample, baseline-verify, nl-demo migration note
- **Migration note**: `LLMClient` contract migrated from `Promise<string>` → `Promise<LiveOutcome>`; `LiveTransportAbort` removed. See ADR-019 below for rationale.

### 2026-04-22 - Backlog #208: Schema-rooted `kind` discriminator on TimelineEntry
- **Status**: Completed (PR #513 open — supersedes PR #508 and PR #507)
- **Description**: Added optional `activity_type` enum to LinkML `LogEntry`; regenerated Pydantic / TypeScript / JSON Schema; projected onto UI-side `TimelineEntry.kind`; switched `LogEntry.tsx` off the feature-176 `ToolCategory === 'snapshot'` conflation; fixed the latent bug where export tools (`export-png`, `export-csv`, `export-geojson`) rendered with the "Manual checkpoint" placeholder. Added two CI drift tests (SC-001 semantic-gate, SC-005 projection-purity). Supersedes feature 176 Decision 2A (ADR-023).
- **URL**: https://github.com/debrief/debrief-future/pull/513
- **Evidence**: [`specs/208-timeline-entry-kind/evidence/`](../../specs/208-timeline-entry-kind/evidence/)

### 2026-04-21 - #217: Storyboarding — Panel + Playback (E024 3/4)
- **Status**: Completed (implementation merged)
- **Description**: Multi-Storyboard dropdown, TransportRow (Prev/Next + scoped Left/Right-arrow keybindings), Leaflet `flyTo` animation, scrub-window lock via `TimeRangeViewProvider.setScrubbableRange`, on-map `SceneRectangleLayer` overlay for the active Storyboard, missing-data hard-block modal with `Jump Past` chain-walker. `StoryboardPlaybackService` on the extension host; three-trigger (moveend / visibility-false / safety-timer) transition-clear invariant with idempotent-by-token clear handler. ~154 unit tests across 11 suites; 23 commits; zero new runtime dependencies.
- **URL**: https://github.com/debrief/debrief-future/tree/main/specs/217-storyboarding-playback
- **Evidence**: [`specs/217-storyboarding-playback/evidence/`](../../specs/217-storyboarding-playback/evidence/)

### 2026-04-21 - #216: Storyboarding — Capture (E024 2/4)
- **Status**: Completed (implementation merged)
- **Description**: Ctrl/Cmd+Alt+C capture flow in the Map Viewer. First-capture inline quick-pick for Storyboard name; synchronous #174 thumbnail write via new per-Scene `sceneThumbnailService`; DTG-default Scene title via #215's `formatDtg`; duplicate-timestamp Replace/Offset/Cancel modal with 5-retry safety cap; minimal Storyboard panel auto-focuses to confirm persistence. 55 unit tests across 6 suites; webview E2E stubbed pending Blocker #143.
- **URL**: https://github.com/debrief/debrief-future/tree/main/specs/216-storyboarding-capture
- **Evidence**: [`specs/216-storyboarding-capture/evidence/`](../../specs/216-storyboarding-capture/evidence/)

### 2026-03-18 - Fix ruff format violations in stac service
- **Status**: Completed
- **Description**: CI failing due to 3 files needing reformatting: `artifacts.py`, `plot.py`, `test_plot.py`. Applied `ruff format`.

### 2026-02-10 - #208: VS Code Extension Bugs (Backlog #077)
- **Status**: In-progress (approved, awaiting implementation)
- **Description**: 4 symptoms: time slider doesn't update tracks, no location marker in Full mode, trail mode shows no tracks, no tools offered. Added as backlog item #077, approved.
- **URL**: https://github.com/debrief/debrief-future/issues/208

### 2025-01-23 - #61: REP Special Comments Parser
- **Status**: Completed
- **Description**: Added annotation parsing infrastructure for REP special comments
- **URL**: https://github.com/debrief/debrief-future/pull/61

### 2025-01-23 - #59: GeoJSON Styling Schemas
- **Status**: Completed
- **Description**: Added schema definitions for GeoJSON styling
- **URL**: https://github.com/debrief/debrief-future/pull/59
