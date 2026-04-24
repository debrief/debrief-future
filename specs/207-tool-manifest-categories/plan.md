# Implementation Plan: Tool Manifest Lookup for Log Panel Category Resolution

**Branch**: `207-tool-manifest-categories` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/207-tool-manifest-categories/spec.md`

## Summary

Retire the hand-coded `TOOL_ID_TO_CATEGORY` shim that was introduced as an interim in #176. Replace it with a manifest-declared visual category: tools declare one of `import | style | calc | filter | snapshot` at their registration site (Python `@tool` decorator, TypeScript tool exports); the LinkML `Tool` class gains a typed `category` enum; the MCP `tools/list` annotation path carries the value to the webview; the `LogPanel` webview app caches the manifest and supplies a resolver to the component, which resolves each card's icon colour at render time. Fail-closed fallback to neutral-grey for missing/invalid values. No new runtime dependencies.

## Technical Context

**Language/Version**: Python 3.11 (calc registry, Pydantic tool models); TypeScript 5.x strict (VS Code extension + `@debrief/components` + webview); LinkML ≥ 1.7.0 (schema source of truth)
**Primary Dependencies**: `debrief_schemas` (Pydantic generated), `@debrief/schemas` (TypeScript generated), existing MCP tools/list pipeline (`apps/vscode/src/services/calcService.ts`, `shared/utils/src/mcp-types.ts`), existing LogPanel message contract (`apps/vscode/src/webview/logPanelMessages.ts`). No new runtime deps.
**Storage**: N/A — manifest is ephemeral runtime metadata; no persistence changes. No session-state migration.
**Testing**: pytest + schema-adherence tests (Python side), vitest (TypeScript + React components), Storybook visual regression for the LogPanel cards (existing infra).
**Target Platform**: Same as LogPanel today — VS Code extension webview on desktop (Linux / macOS / Windows) running against a local Python MCP server. Offline by default.
**Project Type**: Monorepo (pnpm workspaces + uv workspaces). Feature touches `shared/schemas/` (LinkML), `services/calc/` (Python registry), `apps/vscode/src/` (extension + webview), `shared/components/src/LogPanel/` (React component), `shared/utils/src/mcp-types.ts` (annotation typing).
**Performance Goals**: O(1) manifest lookup per card render (`Map<toolId, ToolCategory>`). Tool-manifest delivered once per session (existing `listTools()` cache — 60 s TTL). No perceptible lag; no extra network calls (manifest travels alongside existing `tools/list` response).
**Constraints**: Must not flash wrong (non-grey) icon colour while manifest is loading. Must not crash the LogPanel on malformed manifest entries. First-party misdeclarations must fail `task verify`. Adding a new tool must not require any change under `shared/components/`.
**Scale/Scope**: ~20 first-party tools (calc Python + VS Code TypeScript today); open-ended contrib population. ~100–1000 log entries per session. Five canonical category values; no expansion in this feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status | Notes |
|---------|-----------|--------|-------|
| I — Defence-Grade Reliability | HIGH | ✅ Pass | Manifest data is local (travels in-process via MCP over stdio). `I.3 No silent failures`: invalid category values surface via dev-visible warning + CI. `I.4 Reproducibility`: no behaviour change for well-declared tools; the manifest is deterministic per tool registry. |
| II — Schema Integrity | HIGH | ✅ Pass | New `ToolCategoryEnum` and `category` attribute added to `shared/schemas/src/linkml/tool.yaml` (LinkML source of truth). Pydantic + TypeScript types regenerated from LinkML. Golden-fixture and round-trip tests updated to cover the new field. |
| III — Data Sovereignty | LOW | ✅ Pass | No user data, no telemetry, no external calls. |
| IV — Architectural Boundaries | HIGH | ✅ Pass | Calc service emits metadata; the VS Code extension host translates it into a webview message; the LogPanel component consumes a passed-in resolver. Services do not touch UI; frontends do not persist. |
| V — Extensibility | HIGH | ✅ Pass | Category is declared at the registration site — contrib tools in `contrib/**` opt in by declaring a value. Broken contrib declarations fail closed (grey fallback) without affecting core (`V.1 Fail-safe loading`). |
| VI — Testing | HIGH | ✅ Pass | Schema adherence tests for the new enum. Python unit tests for `@tool` decorator + `to_mcp_tool()`. TypeScript unit tests for `resolveToolCategory` + manifest resolver. Storybook visual regression for LogPanel icon rendering. |
| VII — Test-Driven AI Collaboration | MED | ✅ Pass | Each FR in spec.md maps to one or more verifiable tests. `/speckit.tasks` will generate a failing-test-first task sequence. |
| VIII — Documentation | MED | ✅ Pass | SRD already documents the five-category visual taxonomy (`docs/log-panel-ux-srd.md` §5). This feature adds a `quickstart.md` showing tool authors how to declare a category. |
| IX — Dependencies | LOW | ✅ Pass | Zero new runtime or build-time dependencies introduced. |
| X — Security | LOW | ✅ Pass | No credentials, no network, no classification concerns. |
| XI — Internationalisation | LOW | ✅ Pass | Category labels ("Import", "Style", "Calculation", …) already live in `strings.ts` (externalisable). This feature changes no user-facing strings. |
| XII — Community Engagement | LOW | ✅ Pass | Planning Post + LinkedIn summary published via `/speckit.plan` Phase 2. |
| XIII — Contribution Standards | MED | ✅ Pass | Atomic commits planned per phase in `/speckit.tasks`. CI must pass — existing `task verify` gate covers lint + typecheck + test. |
| XIV — Pre-Release Freedom | — | ✅ N/A | Pre-4.0 — breaking changes permitted. This feature is non-breaking to external consumers regardless; the LinkML `category` attribute is optional. |
| XV — Strict Type Safety | HIGH | ✅ Pass | `ToolCategoryEnum` generated from LinkML produces a strict Python `StrEnum` and TypeScript literal union. No `any`/`Any` introduced. The MCP annotation type in `shared/utils/src/mcp-types.ts` gains a new optional field (`debrief:uiCategory?: ToolCategory`) fully typed. |

**Result**: All applicable articles pass. **No violations → no entries in Complexity Tracking.** Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/207-tool-manifest-categories/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output — "how to declare a tool category"
├── contracts/
│   ├── tool-schema.md   # LinkML Tool class additions
│   └── mcp-annotations.md   # debrief:uiCategory annotation spec
├── checklists/
│   └── requirements.md  # Spec quality checklist (already present)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
shared/
├── schemas/
│   └── src/linkml/
│       └── tool.yaml                # MODIFIED — add ToolCategoryEnum + Tool.category attribute
│
├── components/
│   └── src/LogPanel/
│       ├── toolCategories.ts        # MODIFIED — remove TOOL_ID_TO_CATEGORY map; export resolver that takes a manifest
│       ├── types.ts                 # MODIFIED — extend LogPanelProps with optional toolCategories map
│       ├── ToolCategoryIcon.tsx     # MODIFIED — accept resolved category rather than looking it up by name
│       ├── LogEntry.tsx             # MODIFIED — thread resolver/map through to ToolCategoryIcon
│       ├── LogPanel.tsx             # MODIFIED — accept and distribute toolCategories map
│       └── __tests__/
│           └── toolCategories.test.ts   # NEW — unit tests for manifest-backed resolver
│
└── utils/
    └── src/mcp-types.ts             # MODIFIED — add debrief:uiCategory?: ToolCategory to MCPToolDefinition.annotations

services/
└── calc/
    └── debrief_calc/
        ├── models.py                # MODIFIED — Tool gets `category: ToolCategory | None`; to_mcp_tool() emits debrief:uiCategory
        ├── registry.py              # MODIFIED — @tool decorator accepts category kwarg
        └── tools/                   # ALL tool definitions updated with category=ToolCategory.CALC|IMPORT|…

apps/
└── vscode/
    └── src/
        ├── tools/                   # ALL TS tool definitions updated with 'debrief:uiCategory' annotation
        ├── services/
        │   └── calcService.ts       # MODIFIED — listTools() returns tools with category; exposes toolCategoryMap
        ├── panels/
        │   └── logPanelProvider.ts  # MODIFIED — fetch tool categories on session start + push to webview
        ├── webview/
        │   ├── logPanelMessages.ts  # MODIFIED — new 'tools:manifest' extension→webview message
        │   └── web/logPanel.tsx     # MODIFIED — receive manifest, pass toolCategories prop to LogPanel

specs/207-tool-manifest-categories/
└── evidence/                        # Evidence artefacts captured during implementation
```

**Structure Decision**: Strict monorepo layout. Source of truth flows: LinkML (`shared/schemas`) → generated Python + TypeScript → Python tool registry + TypeScript tool registry → MCP annotations → VS Code extension host → webview message → LogPanel React component. The changes affect every layer but remain *additive* — no existing consumer is broken.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| LogPanel — manifest-fed categories | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `log-panel-manifest-categories.js` | Demonstrate cards coloured from manifest data (import/style/calc/filter/snapshot) including an "unknown" fallback grey card |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change — for all tools previously absent from the static map, the icon now resolves correctly; grey-fallback semantics also shift from "not in hand-list" to "not declared in manifest".
- [x] Interactive demo adds narrative value — story can demo the before/after by toggling between the static-shim map and a manifest fixture.

**Bundleability Verified**:
- [x] Stories exist in Storybook (`LogPanel.stories.tsx` already ships 072/113/176 scenarios)
- [x] Components render standalone (LogPanel is a pure component; no VS Code API required in stories)
- [x] Reasonable bundle size expected (< 500KB — LogPanel bundle is already shipped in other posts)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/logpanel-tool-categories--manifest-fed`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `LogPanel.stories.tsx` (existing — new `ManifestCategories` story) | Card icon renders correct colour/glyph for each of the five buckets; unknown tool falls back to grey; mid-load state shows grey then updates | light, dark, vscode | none (passive render) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input *(N/A — passive render; kept for checklist completeness)*
- [x] Accessibility attributes present (data-testid, aria-* on icons — unchanged from #176)
- [x] Screenshots captured for evidence (one per theme × five categories + grey fallback)

**Test File Location**: `shared/components/e2e/LogPanel.manifest-categories.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=logpanel-tool-categories--manifest-fed&globals=theme:light
/iframe.html?id=logpanel-tool-categories--manifest-fed&globals=theme:dark
/iframe.html?id=logpanel-tool-categories--manifest-fed&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Open sample session → LogPanel shows coloured icons for every registered calc tool (no grey except for intentionally-unknown tool IDs) | Log Panel (webview) | `[data-testid="tool-category-icon"]`, `[data-testid="log-entry"]` | open sample `.debrief` file, scroll log, assert per-card icon classname/data-attr |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors (none new — reuse `ToolCategoryIcon` testid)
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-log-panel-manifest-categories.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

*No Constitution Check violations — table intentionally empty.*
