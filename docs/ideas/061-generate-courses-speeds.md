# Generate Courses and Speeds for Track Tool Spec

## Problem

Track positions record location and time but not the derived navigational data — course (heading) and speed between consecutive positions. This is fundamental maritime analysis data needed for understanding vessel behavior, detecting manoeuvres, and feeding into further analysis tools.

## Proposed Solution

Create a language-neutral tool specification (following #049 tool documentation model) for deriving course and speed data from a track:

- **Input**: A selected track (must have at least 2 positions with timestamps)
- **Operation**: For each consecutive pair of positions, calculate:
  - **Course** — initial bearing from position N to position N+1 (degrees, 0-360)
  - **Speed** — distance / time between positions (knots, i.e. nautical miles per hour)
- **Output**: Dataset with time-series of course and speed values, one entry per position pair, provenance recording the source track

## Success Criteria

- Language-neutral tool spec following #049 template (9 required sections)
- Golden I/O examples with `.input.json` and `.output.json` fixtures
- Covers edge cases: stationary vessel (zero distance), single-position track, very short time intervals
- Uses great-circle bearing and Haversine distance (consistent with existing range_bearing.py math)
- Speed in knots, course in degrees (0-360)

## Constraints

- Must follow tool documentation model from #049
- Great-circle math (not rhumb line)
- Must work offline (CONSTITUTION Art. I)
- Provenance must record source track

## Out of Scope

- Smoothing or filtering of derived values
- Course-made-good or speed-made-good over longer windows
- Python/TypeScript implementation (spec only)
