Shipped: parameter tuning with automatic cascading replay. Change one value in your analysis chain, the system re-executes that step and every step after it. Plot updates in place, no manual re-runs.

Also shipped: "Revert to here" (permanent timeline truncation) and "Revert this" (soft-delete a single operation with automatic replay). The system halts if a later operation depended on the one you removed, so you always know whether your revert worked or broke a dependency.

The Replay Engine is a pure function with dependency injection — fully testable with mocks, no framework coupling. Version mismatch detection is strict: if a tool has changed since the original run, replay halts before executing. Reproducibility over silent surprises.

56 new unit tests, all passing. Cross-snapshot replay works — tune a parameter from earlier history, the system loads that snapshot, replays forward through all segments, and reconstructs your current state.

https://debrief.github.io/blog/2026/02/11/shipped-replay-and-parameter-tuning

#FutureDebrief #MaritimeAnalysis #OpenSource
