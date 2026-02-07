# LinkedIn Summary: Context-Sensitive Tool Offering in VS Code

Analysis tools in the VS Code extension now appear based on what you've selected. Select two tracks, see tools that operate on two tracks. Select a track and a reference point, different tools show up.

The integration bridges three components: ToolMatchService (matching logic from #027), SessionManager (shared selection state from #029), and CalcService (execution via debrief-calc's MCP server). ToolMatchAdapter converts feature IDs to kind counts and evaluates tool requirements in real-time.

Three access patterns work simultaneously: sidebar Tools panel for browsing, right-click context menu for quick access, Command Palette for keyboard workflows. Results include inline provenance metadata tracing every computation back to source features.

237 tests passing. Tool discovery, execution, and provenance tracking complete.

Read the full writeup: [link to blog post]

#FutureDebrief #MaritimeAnalysis #OpenSource
