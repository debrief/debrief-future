# Changelog

All notable changes to Debrief are tracked here. This file follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) convention and semantic versioning at the repo level.

## [Unreleased]

### Added

- **#242 — Backlog Navigator (planning tool).** New static SPA at `apps/backlog-navigator/` that renders `BACKLOG.md` as an interactive table — sort by ID/Total/Updated/Created, filter (Status / Category / Epic / Complexity / free-text), group by epic with `done/total` progress bars, edit any cell with context-sensitive controls, stage edits in `localStorage`, and push every staged change as a single commit + PR via the GitHub Contents API. Dry-run mode is a real product capability (per-PR previews bake in `VITE_BACKLOG_NAV_DRY_RUN=true`); PR mode (`?pr=NNN`) commits onto a PR's head branch. Includes the additive `BACKLOG.md` schema refactor (new `Epic` / `Created` / `Updated` columns + Epics-table normalisation), a one-shot Python backfill script, a byte-for-byte stable parser/serialiser with a CI round-trip gate, and three GitHub Actions workflows mirroring spec-navigator's deployment trio. 51 Vitest unit tests, 12 Playwright E2E tests (incl. axe a11y assertions on the browse view + Push dialog), zero `any` casts, single new runtime dependency (`diff`). See [`specs/242-backlog-navigator/`](specs/242-backlog-navigator/). ([PR TBD])

- **#217 — Storyboarding: Panel + Playback (E024 3/4).** Multi-Storyboard dropdown, TransportRow (Prev/Next + scoped Left/Right-arrow keybindings), Leaflet `flyTo` animation, scrub-window lock, on-map Scene rectangles for the active Storyboard, missing-data hard-block modal with `Jump Past`. `StoryboardPlaybackService` on the extension host; three-trigger transition-clear invariant. ~154 unit tests, zero new runtime dependencies. See [`specs/217-storyboarding-playback/`](specs/217-storyboarding-playback/). ([PR TBD])
