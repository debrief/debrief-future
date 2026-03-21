25 independent GeoJSONFeature definitions in one monorepo. Four incompatible TimeRange types. Service code importing from UI packages.

Future Debrief has grown fast — 20+ packages across Python and TypeScript, each spec'd and tested. But the connective tissue between packages has drifted. This week I'm doing a codebase hygiene pass: consolidating duplicate types to single canonical definitions, aligning dependency versions, fixing cross-layer architectural violations, and closing gaps in lint and test coverage configuration.

The most interesting decision: we're not unifying everything. TypeScript module settings are intentionally different per target environment, and that's fine. The goal is consistency where it prevents bugs, documentation where divergence is deliberate.

https://debrief.github.io/blog/planning-review-technical-debt

#FutureDebrief #MaritimeAnalysis #OpenSource
