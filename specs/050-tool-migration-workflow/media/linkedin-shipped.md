# LinkedIn: Tool Migration Workflow Shipped

**Character count**: ~1,100 (within LinkedIn limits)

---

We just shipped a systematic workflow for migrating tools from Legacy Debrief to Future Debrief.

Legacy Debrief has 20 years of maritime analysis tools: range bearings, track interpolation, sensor coverage. Each one encodes domain knowledge from analysts who understood real operational needs.

Rather than rewrite from scratch, we built a migration workflow:

**Four commands:**
- `/tool.discover` - inventory tools in Java source
- `/tool.spec` - generate language-neutral specifications
- `/tool.implement` - produce Python + TypeScript code
- `/tool.verify` - validate against golden examples

**Four agents:**
- legacy-tool-analyst (reads Java, extracts algorithms)
- tool-spec-author (writes specs from template)
- tool-implementer (generates idiomatic code)
- golden-example-validator (compares with epsilon tolerance)

The key insight: Claude reads Java well enough to extract algorithm logic directly. No AST parsing, no static analysis tools. Just code comprehension including comments and naming conventions.

Golden examples come from a JUnit harness that captures actual Java tool input/output as JSON. Manual, but takes ten minutes per tool. For a one-time migration, that's acceptable.

Verification uses 1e-9 epsilon tolerance for floating-point comparisons. Tight enough to catch bugs, loose enough to handle representation differences between Java, Python, and TypeScript.

The pattern extends beyond tool migration: commands orchestrate, agents specialize. Clear entry points, focused expertise.

Now we migrate tools. Starting with track styling, then analysis. Each one verified end-to-end before moving to the next.

#SoftwareEngineering #LegacyMigration #DeveloperTools #MaritimeAnalysis #AI
