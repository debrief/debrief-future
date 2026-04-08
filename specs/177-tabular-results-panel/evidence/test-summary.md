---
feature: 177-tabular-results-panel
captured_at: "2026-04-03T13:52:00Z"
git_sha: 8337d55
tests_passed: 1588
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Tabular Results Panel

## Test Breakdown

### CSV Utilities (`shared/utils/tests/csv.test.ts`)
- **26 tests passed** (0 failed)
- sanitizeFilename: 7 tests — safe chars, spaces, special chars, consecutive hyphens, trimming, max length, preserving allowed chars
- generateCsvFilename: 4 tests — date-stamped, base name only, base + tag, sanitization
- formatCsvValue: 9 tests — null, undefined, numbers (4 sig figs), integers, large numbers, NaN, Infinity, comma quoting, quote escaping, plain strings, Date ISO 8601
- buildCsvContent: 4 tests — empty data, headers from keys, custom headers, Unix line endings

### TableRenderer (`shared/components/src/TableRenderer/TableRenderer.test.tsx`)
- **7 tests passed** (0 failed)
- Empty state rendering
- Column headers from data keys
- Data value rendering
- 4 significant figure formatting
- Null value display (em-dash)
- Accessibility (table role, aria-label)
- Custom className

### Existing Test Suites (regression)
- `@debrief/utils`: 127 tests passed
- `@debrief/components`: 1123 tests passed
- `@debrief/vscode`: 338 tests passed
- All TypeScript typechecks passed
- All lint checks passed (ESLint + ruff)

## Key Scenarios Verified

1. CSV formatting with 4 significant figures and locale-independent decimals
2. Filename sanitization with special character replacement and length limits
3. Table rendering with accessible HTML semantics
4. Display hint dispatch (table vs chart) in ChartPanelWrapper
5. Save/Save As UI with unsaved indicator and disabled state
6. Error state display with retry button
7. Full backward compatibility with existing chart tab functionality

## Known Issues

None. All existing tests continue to pass.
