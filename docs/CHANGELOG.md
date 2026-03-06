# Changelog

## [2026-03-06]

### Added
- **Client-Side CQL2 Filter Engine** — Reference implementation of CQL2 AND/OR filter logic for 9 metadata types, operating on mock STAC items; validates query model without backend.
  - Tests: 74/74 passing
  - Evidence: test-summary.md, usage-example.md, filter-output-samples.json
- **STAC Extension Spec + Mock Data Fixtures** — Define `debrief:` STAC extension namespace with 6 properties; generate 100 deterministic fixture items for Discovery UI development.
  - Tests: 210/210 passing
  - Evidence: test-summary.md, usage-example.md, round-trip-evidence.md, validation-output.txt
