# Implement Phase 3 tools: track/manipulation (12 tools)

## Problem

12 track/manipulation tool specs exist with golden I/O but no implementations. These tools transform tracks — grouping, merging, splitting, trimming, interpolating, smoothing — and are essential for analysts preparing data for analysis.

## Proposed Solution

Implement 12 tools in `services/calc/`:

**Low complexity (4):** group-tracks, group-lightweight-tracks, convert-lightweight-to-track, convert-track-to-lightweight

**Medium complexity (4):** interpolate-track, merge-tracks, trim-track, set-time-zero

**High complexity (4):** split-tracks-into-legs, remove-track-jumps, smooth-track-jumps, convert-absolute-tma-to-relative

## Success Criteria

- All 12 tools pass golden I/O fixtures
- Tools that produce new features (split, merge) return correct addition responses
- Tools that modify features (trim, smooth) return correct mutation responses

## Constraints

- Requires Phase 1 complete (measurement tools validate the pipeline)
- convert-absolute-tma-to-relative and convert-lightweight-to-track require #062 (schema extensions for TMA_SEGMENT, LIGHTWEIGHT_TRACK)
