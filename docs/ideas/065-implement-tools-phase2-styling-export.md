# Implement Phase 2 tools: track/styling + dataset/export (15 tools)

## Problem

15 tool specs for track styling and dataset export exist with golden I/O but no implementations. These tools handle visual presentation (colours, symbols, labels) and data export (CSV, GPX, RTF, WMF, GeoPDF), enabling analysts to customise displays and produce deliverables.

## Proposed Solution

Implement 15 tools in `services/calc/`:

**track/styling (7 tools):** set-track-color, apply-symbol-style, symbol-interval, label-interval, hide-reveal-objects, reformat-fixes, rainbow-shade-sonar-cuts

**dataset/export (8 tools):** export-track-as-csv, export-track-to-gpx, export-rtf, export-wmf, export-as-geo-pdf, copy-bearings-to-clipboard, copy-time-data-to-clipboard, paste-rep-clipboard

Each must pass golden I/O fixtures and follow spec pseudocode.

## Success Criteria

- All 15 tools pass golden I/O fixtures
- Export tools produce valid output in their target formats
- Styling tools produce correct mutation responses

## Constraints

- Requires Phase 1 (measurement tools validate the implementation pipeline)
- No schema extensions needed — uses existing TRACK kind
- Export tools may need third-party libraries for RTF/WMF/GeoPDF generation

## Out of Scope

- Tools from other categories
- Clipboard integration with VS Code (platform-specific)
