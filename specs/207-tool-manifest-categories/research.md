# Research: Tool Manifest Lookup for Log Panel Category Resolution

**Feature**: 207-tool-manifest-categories
**Date**: 2026-04-22

## R1: Where does the visual-category enum live?

**Decision**: Add a `ToolCategoryEnum` to `shared/schemas/src/linkml/tool.yaml` (LinkML source of truth) and regenerate Python and TypeScript types. Add a `category` optional attribute (range `ToolCategoryEnum`) to the existing LinkML `Tool` class.

**Rationale**: Constitution Article II.1 mandates that LinkML is the single source of truth for all data structures. The existing `tool.yaml` already defines the `Tool` class and two adjacent enums (`OutputKindEnum`, `ResultCategoryEnum`, `ParameterTypeEnum`) that follow exactly the pattern we need. Reusing this file keeps related tool metadata together and guarantees the Python `debrief_schemas.Tool` model and the TypeScript `@debrief/schemas` types stay in lock-step — which is what produces the strict typing needed by Article XV.

**Alternatives considered**:
- **Hand-written TypeScript literal union + hand-written Python `StrEnum`** — rejected because the two representations would drift and Article II.1 forbids hand-written schema types.
- **New separate LinkML file (`tool-category.yaml`)** — rejected. The category is an intrinsic property of the `Tool` class and belongs beside it; a separate file adds ceremony with no benefit.
- **Extend `ResultCategoryEnum` to include UI buckets** — rejected. `ResultCategoryEnum` (`mutation | addition | deletion | artifact`) describes the *effect* of a tool on the feature collection, which is orthogonal to the UI category (which is a visual family grouping). Conflating them would break tool-match and other consumers.

**Implementation notes**:
- Canonical values: `import | style | calc | filter | snapshot` (exactly the five SRD buckets).
- Attribute `Tool.category` is *optional* at the schema level (null-valued → grey fallback per FR-007). Enforcement of "first-party tools must declare" is a project policy enforced by test/lint (see R5), not a schema `required: true` — that would retroactively break tool declarations that predate this feature and require a synchronized migration.

## R2: How does the category reach the Log Panel webview?

**Decision**: Ride the existing MCP `tools/list` path. The Python `Tool.to_mcp_tool()` method adds a new annotation key `debrief:uiCategory` (value: `ToolCategory | null`) alongside the existing `debrief:category`, `debrief:selectionRequirements`, etc. The TypeScript MCP annotation type in `shared/utils/src/mcp-types.ts` gains the same optional field. The VS Code extension's `calcService.listTools()` already fetches and caches this response; a new helper `getToolCategoryMap()` exposes a `Record<toolId, ToolCategory | null>` to the panel provider.

**Rationale**: The `tools/list` pipeline is already the "tool manifest" described by the SRD — it carries per-tool metadata (name, description, requirements, selection requirements) to exactly the places that need it, and the VS Code extension already caches it (60 s TTL). Reusing it gives us delivery, caching, invalidation, and the MCP wire contract for free. Adding a new endpoint (e.g., `categories/list`) would duplicate plumbing for no gain and would split the tool metadata across two pathways (violating Article IV's "clear separation, no exceptions" intent).

**Alternatives considered**:
- **Embed `uiCategory` on each `TimelineEntry`** — rejected. It would couple the log-entry payload to tool metadata and duplicate the category for every entry (N entries, not N tools). Also would require emitting the category wherever entries are constructed, which is further downstream than the registration site.
- **New dedicated webview message `tools:manifest`** — partially adopted. We still need a message *into* the webview (see R3); but the *source* of truth remains `tools/list`, not a separate MCP endpoint.
- **Inline category in the existing `timeline:update` message** — rejected. Tool metadata and timeline data have different lifecycles (manifest is per-session, timeline is per-tool-invocation). Mixing them forces unrelated re-renders.

## R3: How does the webview React component consume the category?

**Decision**: The extension host pushes a new `tools:manifest` message to the webview on session start and whenever the `listTools()` cache refreshes. Payload: `{ categories: Record<string, ToolCategory | null> }` — keyed by tool ID. The webview (`apps/vscode/src/webview/web/logPanel.tsx`) stores it in state and passes it to `<LogPanel toolCategories={…} />` as a new optional prop. `LogPanel.tsx` threads it into `ToolCategoryIcon`, which calls the existing `resolveToolCategory(toolName, toolCategories)` — now taking the map as its second argument. If the map is undefined or the tool is absent, `resolveToolCategory` falls back to `UNKNOWN_CATEGORY_CONFIG` (unchanged behaviour).

**Rationale**: This honours Article IV.1 (services never touch UI) and IV.2 (frontends never persist). The component API remains declarative — pass data in, render. No hidden lookups; no context required for unit tests. Storybook stories and web-shell demos can supply a fixture map directly.

**Alternatives considered**:
- **Global React context** — rejected. Adds implicit coupling, makes the component harder to test, and is overkill for a single-map prop.
- **Per-entry category resolved inside the extension before send** — rejected. Would duplicate the category on every `TimelineEntry` and re-resolve on every manifest change.
- **Keep `resolveToolCategory` reading a module-global map** — rejected. Module-globals are an anti-pattern in Storybook and tests; the existing static map was itself an interim example of that anti-pattern.

**API shape**:
```typescript
// Before (interim):
resolveToolCategory(toolName: string): ToolCategoryConfig

// After (manifest-fed):
resolveToolCategory(
  toolName: string,
  categories?: Readonly<Record<string, ToolCategory | null>>
): ToolCategoryConfig
```

## R4: Loading race — avoiding a flash of wrong colour

**Decision**: The initial manifest state in the webview is `undefined` (not an empty map). While undefined, `resolveToolCategory` returns the grey fallback for every tool. When the first `tools:manifest` message arrives, the state becomes a map and icons re-resolve. React's reconciliation handles the transition; because the webview already re-renders on every `timeline:update`, no special handling is needed.

**Rationale**: An empty-map sentinel would be indistinguishable from "no tool has a category", which is a different semantic from "manifest not yet loaded". Using `undefined` for "not loaded" and a map for "loaded" keeps the semantics clean and matches React idioms.

**Alternatives considered**:
- **Block the panel render until the manifest is loaded** — rejected. The panel must render as soon as a session opens; waiting for a synchronous MCP round-trip defeats the panel's instant-feedback contract.
- **Optimistically apply a stale cached manifest** — rejected. The cache lives in the extension host and is already used by `listTools()`. The webview receives whatever the extension sends; caching there would be a second layer with no benefit.

## R5: CI enforcement — catching typos in first-party tool declarations

**Decision**: Two layers of enforcement:

1. **Schema-level (automatic)**: The LinkML-generated `ToolCategoryEnum` is a typed enum in both Python and TypeScript. A first-party author writing `category="geometry"` in Python will be rejected by Pydantic validation at test time (the Python tool registry runs `Tool(…)` construction during module import in tests). A TypeScript author writing `'debrief:uiCategory': 'geometry'` will fail `pnpm typecheck` because the annotation field is typed as `ToolCategory | undefined`.

2. **Policy-level (explicit)**: A new test file `services/calc/tests/test_first_party_categories.py` iterates over the global `registry.list_all()` and asserts that every registered tool has `tool.category is not None`. A matching TypeScript test in `apps/vscode/src/tools/__tests__/first-party-categories.test.ts` iterates the static tool imports and asserts each exports a non-null `debrief:uiCategory` annotation.

**Rationale**: Article XV.6 requires type checking as a required CI step; the LinkML-generated enum delivers this for typos. Article VI.2 requires unit tests for services; the first-party-coverage test is that for the registry. Together these catch both "typo" and "forgot to declare" cases before merge — the two failure modes the spec calls out.

**Alternatives considered**:
- **Rely on type checking alone** — insufficient: typed `ToolCategory | null` still allows `null`, so a first-party tool that forgets to declare would slip through.
- **Make `category` required in the LinkML schema** — rejected. Would break contrib tools that choose to omit it, and would require a synchronized migration of every existing tool in one commit.
- **Runtime warning with no test** — rejected. Silent logs are easy to ignore; a failing test is not.

## R6: Migration path for existing tools (no regression)

**Decision**: Tools are migrated in two coordinated commits:

1. **Commit A — add the field additively**: LinkML schema + regenerated types + `@tool` decorator accepts optional `category=` kwarg + `to_mcp_tool()` emits `debrief:uiCategory`. Static `TOOL_ID_TO_CATEGORY` map still exists and is still consulted as a secondary path. All existing tools receive their correct category via the map.

2. **Commit B — retire the shim**: Every first-party tool (Python + TypeScript) is updated to declare its category directly at the registration site, matching what the map used to return for it. Then `TOOL_ID_TO_CATEGORY` is deleted, `resolveToolCategory` takes only the manifest path, and the first-party-coverage test is turned on.

**Rationale**: This lets us land the infrastructure and the migration independently, verify no visible regression at the intermediate point, and keep each commit atomic (Article XIII.1). The project is pre-4.0 (Article XIV) so we do not need a deprecation window — but splitting reduces review risk and lets a visual-regression screenshot run against the intermediate commit as a safety check.

**Alternatives considered**:
- **One big commit** — rejected for review surface area (touches schema, Python, TypeScript, webview, component, tests all at once).
- **Keep the shim as a permanent fallback** — rejected. The whole point of this feature is to retire it (FR-006).

## R7: Destructive / ambiguous categorisations (`delete-features`)

**Decision**: Preserve the current static-map classifications verbatim during migration. `delete-features` keeps its `style` category. `change-track-color` and `set-display-mode` keep `style`. `export-png`/`export-csv`/`export-geojson` keep `snapshot`. No re-classification in this feature.

**Rationale**: Spec A6 explicitly scopes this out. Changing classifications would be a visible user-facing change that is unrelated to the feature's goal of retiring the shim. Any re-categorisation is a separate conversation, potentially with input from analysts.

**Alternatives considered**:
- **Reclassify `delete-features` to `calc` or introduce a new `destructive` bucket** — rejected; out of scope.

## R8: Duplicate tool IDs across sources (first-party vs contrib)

**Decision**: Keep the existing `ToolRegistry.register()` behaviour: a `ValueError("Tool '{name}' is already registered")` on duplicate registration. Contrib tools that collide with a first-party ID will fail at load time with a clear error. The `calcService.listTools()` pipeline in the VS Code extension already handles tool-registration failures — the broken contrib package is isolated; core continues.

**Rationale**: This is Article V.1 (`Fail-safe loading — a broken extension cannot crash core`) applied to a naming collision. Article V's note explicitly defers extension discovery mechanism, so a hard failure on duplicate IDs is the conservative default. FR-010's "first-party precedence over contrib" is achieved by load order (first-party registered first; contrib duplicates raise).

**Alternatives considered**:
- **Silent last-registered-wins** — rejected; violates `I.3 No silent failures`.
- **First-party wins with warning** — possible but requires a registry-level notion of "first-party vs contrib", which does not exist yet and is out of scope.

## Summary of NEEDS CLARIFICATION items

None remain. The seven research decisions above, together with assumptions A1–A7 in `spec.md`, close every open question identified during `/speckit.plan`.
