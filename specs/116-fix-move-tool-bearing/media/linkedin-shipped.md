When you replay a move operation with a different bearing, the shape now orbits its original position instead of drifting off the previous result.

We added an input snapshot to the PROV log entry — a record of the feature's geometry at the moment the tool executed. When replay re-runs the tool with modified parameters, it restores from that snapshot first. Clean circles. Predictable tuning.

The fix is convention-based: any tool modifying coordinates automatically gets input capture in the executor, before the mutation happens. Individual tools don't need code changes. Future spatial mutation tools inherit the pattern for free.

Also closed a schema-first gap — InputFeatureState now lives in the LinkML master schema instead of hand-written TypeScript types. Generated models, canonical source, round-trip safe.

75 tests, all passing. 933 Python tests overall still green.

[Read the full post](https://debrief.github.io/future/shipped-prov-input-snapshot/)

#FutureDebrief #MaritimeAnalysis #OpenSource
