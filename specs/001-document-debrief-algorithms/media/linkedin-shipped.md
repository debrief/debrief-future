How many maritime analysis tools does a 30-year-old Java codebase contain? We just found out: 85 tool-bearing classes, 58 ready to migrate.

We scanned legacy Debrief's entire codebase and documented every migrateable tool with a language-neutral specification and golden input/output JSON fixtures. 63 specs, 151 test pairs, 7 categories from track measurement to sensor calibration. Plus a schema gap analysis that identified 7 new data types our LinkML schemas need before implementation can begin.

The interesting finding: every tool needed manual golden I/O construction. The legacy tools are too coupled to Eclipse RCP to run in isolation. So we read the source, understood each algorithm, and built representative test fixtures by hand. Slower, but it produced consistent, well-structured examples.

Each spec contains pseudocode precise enough that a developer who has never seen the Java can write a correct implementation. Each golden pair becomes an automated regression test the moment that implementation exists.

Documentation before implementation. Now the migration has a map.

[Read the full shipped post](https://debrief.github.io/future/2026/02/07/shipped-58-legacy-tools-documented-for-migration.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
