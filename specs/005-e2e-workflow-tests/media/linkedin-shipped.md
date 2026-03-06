Debrief's VS Code E2E test suite went from 8 skipped spec files to 18 active ones this week -- all driven by real Python services parsing real REP data, not mocks.

The interesting part isn't the test count. It's the dual-platform strategy: 81 web-shell tests with mock data run in 30 seconds for fast CI feedback. 18 VS Code E2E specs with real debrief-io, debrief-stac, and debrief-calc services take 3 minutes but catch integration bugs that mocks hide. Both suites run in parallel.

We also wrote 28 tests for features that don't exist yet, using Playwright's test.fixme() instead of .skip(). They show up in reports as known gaps, cross-referenced to backlog items. When those features ship, the tests are already waiting.

Writing tests against real services forced us toward structural assertions -- "at least one track exists" rather than "exactly three tracks". More resilient, and they still catch the failures that matter.

https://debrief.github.io/shipped-dual-platform-e2e-tests

#FutureDebrief #MaritimeAnalysis #Testing
