# Performance Benchmark: Array Offset Calculations

**Success criterion**: [`SC-004`](../spec.md#success-criteria) — mode/offset
changes must re-compute all origins within 1 second for datasets of up to
1000 contacts.

**Captured**: 2026-04-14 at `3d42aa0`

## Setup

- Track: 200-point zigzag (0.001° longitudinal wobble + 0.0001° latitudinal
  step per fix) covering ~2 hours at 30-second fix intervals.
- Workload: 1000 contact timestamps evenly spaced across the track's time
  range.
- Operation: 1000 × `computeArrayCentre()` / `compute_array_centre()` calls.
- Three trials per mode; timings reported in wall-clock milliseconds.

## Results

### TypeScript (`vitest` / Node 20)

| Mode  | Trial 1 (ms) | Trial 2 (ms) | Trial 3 (ms) | Min  | Max  | Avg  |
|-------|--------------|--------------|--------------|------|------|------|
| PLAIN | 0.8          | 0.5          | 0.5          | 0.5  | 0.8  | 0.6  |
| WORM  | 88.8         | 83.7         | 77.7         | 77.7 | 88.8 | 83.4 |

### Python (`pytest` / CPython 3.11.15)

| Mode  | Trial 1 (ms) | Trial 2 (ms) | Trial 3 (ms) | Min   | Max   | Avg   |
|-------|--------------|--------------|--------------|-------|-------|-------|
| PLAIN | 1.5          | 1.5          | 1.4          | 1.4   | 1.5   | 1.4   |
| WORM  | 207.4        | 207.4        | 208.4        | 207.4 | 208.4 | 207.7 |

## Budget Utilisation

| Mode  | Language   | Avg (ms) | % of 1 s budget |
|-------|------------|----------|-----------------|
| PLAIN | TypeScript | 0.6      | **0.06 %**      |
| WORM  | TypeScript | 83.4     | **8.3 %**       |
| PLAIN | Python     | 1.4      | **0.14 %**      |
| WORM  | Python     | 207.7    | **20.8 %**      |

## Interpretation

- **All four combinations comfortably meet SC-004 (< 1000 ms for 1000
  contacts).** The most expensive case — Python WORM — still finishes under
  a fifth of the budget.
- WORM is an order of magnitude slower than PLAIN because it walks the
  track path segment-by-segment and parses timestamps on every call.  There
  is ample headroom for larger tracks (the benchmark uses a 200-fix path;
  production tracks are typically 50-200 fixes).
- If a future feature requires significantly tighter budgets, the obvious
  optimisations are:
  1. Pre-compute cumulative track-path distances once per track.
  2. Cache parsed ISO timestamps on the sensor's parent object.
  These are deliberately deferred per research decision **RQ-7**: the
  stateless render pipeline is simple and already fast enough.

## Automated guard

The TypeScript suite includes a budget test
(`array-offset.test.ts` → `performance › computes 1000 contact origins under
the 1-second budget`) that fails CI if WORM rendering regresses past 1 s.
