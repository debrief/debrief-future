How do you test a maritime analysis workflow that spans three Python services, a TypeScript orchestration layer, and a VS Code extension -- without mocking away the parts that actually break?

We're planning dual-platform E2E tests for Future Debrief. The web-shell suite (81 tests, 13 spec files) already catches orchestration regressions with mock data. Now we're expanding the VS Code E2E suite to match -- same 13 workflow categories, but driving openvscode-server with real Python services parsing real REP files. When a test reveals a missing feature, it gets `test.fixme()` with a backlog cross-reference instead of quietly disappearing into a skip count.

The interesting tension: real services give higher confidence but slower, more sensitive tests. We're treating the expansion partly as a feature-completeness audit.

Planning post with the full technical decisions: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
