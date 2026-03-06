How do you get nine UI components to agree on what data looks like before any of them exist? You define the contract first, then generate 100 realistic test fixtures from it.

This week we shipped the `debrief:` STAC extension spec for Future Debrief -- six properties covering vessel classification, tags, nationalities, and authorship, all under a formal namespace. A 4-level vessel taxonomy with 20 types gives downstream components something real to filter against. And a deterministic Python generator produces 100 mock STAC items with skewed distributions across six ocean regions, multiple years, and five duration buckets.

The part that makes it hold together: the extension is defined once in LinkML and generates Pydantic, TypeScript, and JSON Schema automatically. 210 tests verify everything round-trips correctly. Nine Discovery UI components now have a shared development reality to build against.

[Full post](https://debrief.github.io/future/2026/03/06/shipped-stac-extension-mock-data.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
