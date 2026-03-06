# Changelog

## [2026-03-06]

### Added
- **STAC Extension Spec + Mock Data Fixtures** — Define `debrief:` STAC extension namespace with 6 properties; generate 100 deterministic fixture items for Discovery UI development.
  - Tests: 210/210 passing
  - Evidence: test-summary.md, usage-example.md, round-trip-evidence.md, validation-output.txt
- **End-to-End Workflow Tests** — Dual-platform E2E test suite: 18 VS Code E2E specs + 13 web-shell specs with real Python services. ([#300](https://github.com/debrief/debrief-future/pull/300))
  - Tests: ~25 active, ~28 fixme (features pending implementation)
  - Evidence: test-summary.md, usage-example.md, integration-flow.md, 4 screenshots
