Legacy Debrief has two decades of domain knowledge encoded in Java tools. Range bearings, track interpolation, sensor coverage. We're not rewriting that from scratch.

We're building a migration workflow: four slash commands that systematically move tools from the Java codebase to Future Debrief. Discover candidates, generate language-neutral specifications, implement in Python and TypeScript, verify against golden examples captured from the original.

The interesting constraint: you can't automatically run an Eclipse RCP application. So golden I/O capture requires a developer to integrate a JUnit harness. Everything else is automated. Claude reads the Java source directly to extract algorithm logic. No AST parsing needed.

One tool at a time, fully verified. Confidence over speed.

[Read the full planning post](https://debrief.github.io/future/2026/02/05/planning-tool-migration-workflow.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
