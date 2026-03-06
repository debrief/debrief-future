# Changelog

## [2026-03-06]

### Added
- **Filter Bar with Lozenge UI and AND/OR Logic** — Persistent filter bar with pill-shaped lozenges, all 10 SRD filter types, OR groups with drag-to-group, and CQL2 serialisation.
  - Tests: 64/64 passing
  - Evidence: test-summary.md, usage-example.md
- **Client-Side CQL2 Filter Engine** — Reference implementation of CQL2 AND/OR filter logic for 9 metadata types, operating on mock STAC items; validates query model without backend.
  - Tests: 74/74 passing
  - Evidence: test-summary.md, usage-example.md, filter-output-samples.json
- **STAC Extension Spec + Mock Data Fixtures** — Define `debrief:` STAC extension namespace with 6 properties; generate 100 deterministic fixture items for Discovery UI development.
  - Tests: 210/210 passing
  - Evidence: test-summary.md, usage-example.md, round-trip-evidence.md, validation-output.txt
- **End-to-End Workflow Tests** — Dual-platform E2E test suite: 18 VS Code E2E specs + 13 web-shell specs with real Python services. ([#300](https://github.com/debrief/debrief-future/pull/300))
  - Tests: ~25 active, ~28 fixme (features pending implementation)
  - Evidence: test-summary.md, usage-example.md, integration-flow.md, 4 screenshots
