## What We're Building

When an analyst selects two tracks on the map, they shouldn't have to guess which analysis tools work with that selection. The system should show them — instantly.

This week we're integrating the ToolMatchService (built in #027 and tested in Storybook) into the VS Code extension. Select features, see applicable tools. Click a tool, get results with full provenance. Three access patterns — sidebar panel, right-click context menu, Command Palette — so analysts can work however suits them.

The interesting part is the "inactive tools" toggle. Enable it, and tools that don't match your selection stick around with explanations: "Requires 2 tracks (1 selected)". Analysts learn the system's capabilities by seeing what they *could* do with different selections.

## How It Fits

This connects three pieces we've already built:

1. **ToolMatchService** (#027) — the matching logic that evaluates tools against selections
2. **Session-state** (#029) — centralised selection state shared across panels
3. **CalcService** — the bridge to debrief-calc's analysis tools via MCP

The ToolMatchAdapter bridges session-state's feature IDs to the kind-based counts that ToolMatchService expects. CalcService caches tool metadata with a 60-second TTL. VS Code's `when` clauses control menu visibility based on context values we set for each tool.

Results persist to STAC with inline provenance metadata — tool name, version, timestamp, source feature IDs. Every computed result traces back to its inputs.

## Key Decisions

- **Selection bridging**: ToolMatchAdapter converts feature IDs → kind counts by looking up features in the collection. Session-state stays generic; the adapter knows about Debrief kinds.

- **Three UI surfaces**: Sidebar for browsing, context menu for quick access, Command Palette for keyboard workflows. All share the same underlying tool state.

- **Static command registration**: VS Code commands must be registered at activation. We register all tool commands upfront and use `enablement` clauses to hide inapplicable ones.

- **Inline provenance**: Results carry their own provenance metadata rather than linking to separate provenance documents. Simpler querying, Constitution-compliant.

- **Parameterless tools first**: This iteration assumes tools take only a selection. Schema-driven parameter UI is out of scope.
