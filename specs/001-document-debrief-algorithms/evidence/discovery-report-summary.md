# Discovery Report Summary — User Story 1 Evidence

**Date**: 2026-02-07
**Status**: US1 (Discovery) Complete

## Key Metrics

| Metric | Value |
|--------|-------|
| Total tool-bearing classes scanned | ~500+ |
| Classes matching tool patterns | 85 |
| Migrateable tools (Ready) | 58 |
| Tools needing review | 5 |
| Out of scope | 22 |
| Categories populated | 8 of 9 (narrative/formatting empty) |
| Legacy trigger types observed | 6 of 10 |
| Tools with intermediate UI | 14 |
| Already migrated in debrief-future | 4 |
| Net new tools to document | 59 |

## Complexity Distribution

| Complexity | Count | Percentage |
|------------|-------|------------|
| Low | 23 | 37% |
| Medium | 19 | 30% |
| High | 21 | 33% |
| **Total** | **63** | **100%** |

## Category Breakdown

| Category | Tools | Low | Med | High |
|----------|-------|-----|-----|------|
| track/measurement | 19 | 12 | 5 | 2 |
| track/manipulation | 14 | 4 | 5 | 5 |
| track/analysis | 9 | 0 | 1 | 8 |
| dataset/export | 8 | 4 | 4 | 0 |
| sensor/analysis | 7 | 1 | 2 | 4 |
| sensor/calibration | 3 | 0 | 1 | 2 |
| track/styling | 3 | 2 | 1 | 0 |

## Patterns Discovered During Scan

8 additional patterns were identified beyond the initial set:
1. `RightClickContextItemGenerator` — primary context-menu pattern
2. `CMAPOperation` — undo-capable operation base class
3. `toteCalculation` — tote panel calculations
4. `CoreDragOperation` — drag-based manipulation
5. `FilterOperation` — legacy filter operations
6. Package-based: `zig_detector/`, `freq/`, `ambiguity/`
7. Inner class pattern (outer = menu, inner = algorithm)
8. View-embedded algorithms needing extraction

## UX Gaps Identified

Two trigger types have partial gaps in Future Debrief:
- **drag-drop** (5 tools): Need webview drag handles; parametric alternative for MCP
- **wizard** (0 standalone): No gap — no standalone wizard tools found

## Acceptance Criteria Verification

| Criteria | Status |
|----------|--------|
| All tool-bearing classes catalogued | PASS — 85 classes across 4+ package roots |
| All 9 columns populated per tool | PASS — verified in full inventory tables |
| All 10 trigger types in mapping table | PASS — all 10 mapped with gap assessment |
| All tools triaged (Ready/Review/OOS) | PASS — 58 Ready, 5 Review, 22 OOS |
