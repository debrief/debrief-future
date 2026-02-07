# Resample Track Tool Spec

## Problem

Track data often has irregular time intervals between positions. Analysis tools frequently need consistently-spaced positions for meaningful comparison, plotting, or further computation. There is no language-neutral tool spec for resampling a track to regular time intervals.

## Proposed Solution

Create a language-neutral tool specification (following #049 tool documentation model) for a track resampling tool:

- **Input**: A selected track
- **Parameters**:
  - `interval_seconds` — target time interval between positions in seconds (default: 60, i.e. 1 minute)
- **Operation**: Generate new positions at regular time intervals by linearly interpolating latitude, longitude (and optionally depth/elevation) between the bracketing original positions. Original timestamps that don't fall on interval boundaries are replaced.
- **Output**: New track with evenly-spaced positions, provenance recording the original track and resampling interval

## Success Criteria

- Language-neutral tool spec following #049 template (9 required sections)
- Golden I/O examples with `.input.json` and `.output.json` fixtures
- Covers edge cases: track shorter than one interval, single-point tracks, gaps larger than interval
- Interpolation is linear between bracketing positions
- First and last positions match original track's time bounds

## Constraints

- Must follow tool documentation model from #049
- Linear interpolation only (not spline or cubic)
- Must work offline (CONSTITUTION Art. I)
- Provenance must record resampling interval

## Out of Scope

- Gap detection and splitting (resamples across gaps)
- Non-linear interpolation methods
- Python/TypeScript implementation (spec only)
