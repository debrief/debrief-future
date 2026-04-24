# Changelog

All notable changes to Debrief are tracked here. This file follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) convention and semantic versioning at the repo level.

## [Unreleased]

### Added

- **#217 — Storyboarding: Panel + Playback (E024 3/4).** Multi-Storyboard dropdown, TransportRow (Prev/Next + scoped Left/Right-arrow keybindings), Leaflet `flyTo` animation, scrub-window lock, on-map Scene rectangles for the active Storyboard, missing-data hard-block modal with `Jump Past`. `StoryboardPlaybackService` on the extension host; three-trigger transition-clear invariant. ~154 unit tests, zero new runtime dependencies. See [`specs/217-storyboarding-playback/`](specs/217-storyboarding-playback/). ([PR TBD])
