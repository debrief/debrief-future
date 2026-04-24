# Feature Specification: Tool Manifest Lookup for Log Panel Category Resolution

**Feature Branch**: `207-tool-manifest-categories`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Tool manifest lookup for category resolution — replace the static `TOOL_ID_TO_CATEGORY` map in `shared/components/src/LogPanel/toolCategories.ts` with a lookup against a tool manifest. Today the interim static map only knows tools we hand-listed; new tools in `contrib/` or `services/calc/` get the neutral-grey fallback even when they have a clear category. Spec research R1 explicitly flags this as interim and the spec §12 Q1 requires manifest-declared categories. (follow-up to #176, blocked on tool manifest schema definition)"

## Context

Feature #176 (Analysis Log Panel — Rich Card UX) introduced five visual tool categories — `import`, `style`, `calc`, `filter`, `snapshot` — that paint the 18×18 icon on each log card. SRD §12 Q1 and research note R1 explicitly require the category to be **declared in the tool manifest**, not inferred. Because the tool-manifest schema was not yet available when #176 shipped, a static `TOOL_ID_TO_CATEGORY` map was hand-coded in `shared/components/src/LogPanel/toolCategories.ts` as an interim shim. This feature retires that shim by sourcing each tool's visual category from the manifest data that already flows to the Log Panel webview.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New tools get the correct icon colour with zero Log Panel changes (Priority: P1)

A tool author adds a new analysis tool to `services/calc/` (for example, a new track-trimming filter). They declare `import` / `style` / `calc` / `filter` / `snapshot` as the tool's visual category at the point of tool definition — the same place they declare name, description, input kinds, and output kind. The next time the Log Panel renders an entry produced by that tool, the coloured icon appears automatically. No file in `shared/components/src/LogPanel/` needs editing.

**Why this priority**: This is the core value of the feature. Today, every new tool starts life with a neutral-grey icon until someone remembers to also edit `toolCategories.ts` in a separate repo layer — the static map silently decays as the tool ecosystem grows.

**Independent Test**: Register a new test tool in the Python calc registry (or TypeScript VS Code tools directory) with a declared visual category. Exercise an end-to-end flow that emits a Log Panel entry for that tool. Verify the card's icon renders with the declared category's background colour and glyph — without any change to `toolCategories.ts`.

**Acceptance Scenarios**:

1. **Given** a freshly registered calc tool `trim-by-bearing` that declares `filter` as its visual category, **When** the Log Panel receives an entry for that tool, **Then** the card icon renders with the `filter` background (`#fff7ed`) and glyph (`⧖`).
2. **Given** a freshly registered VS Code extension tool that declares `style` as its visual category, **When** the Log Panel renders an entry for that tool, **Then** the card icon renders with the `style` background (`#ede9fe`) and glyph (`🎨`).
3. **Given** the same two tools above, **When** a developer inspects the repository diff for adding them, **Then** no file under `shared/components/src/LogPanel/` has been modified.

---

### User Story 2 - Contrib / third-party tools get coloured icons (Priority: P1)

An operator or integrator adds a tool under `contrib/<org>/` (for example, a customer-specific importer). They declare the tool's visual category using the same manifest contract as first-party tools. The Log Panel renders their tool's icon with the declared colour, identically to first-party tools — no coupling to the Log Panel source, no PR to `shared/components/`.

**Why this priority**: Extensibility is a constitutional principle — services like `io` and `calc` are explicitly "extensible" per CLAUDE.md. Contrib tools today are second-class citizens in the Log Panel: they *cannot* get a category icon without upstream code changes. That violates the extensibility promise.

**Independent Test**: Add a tool via the contrib extension path (or simulate one in test fixtures) that declares `import` as its visual category. Feed a Log Panel entry for that tool through the standard pipeline. Verify the icon is the blue import colour.

**Acceptance Scenarios**:

1. **Given** a contrib tool `org-acme-importer` declaring `import` category, **When** its log entry reaches the Log Panel, **Then** the card icon matches first-party import tools visually.
2. **Given** a contrib tool with no visual category declared, **When** its log entry reaches the Log Panel, **Then** the card icon falls back to the neutral-grey "Other" style without errors.

---

### User Story 3 - Removing the static shim does not regress existing first-party tools (Priority: P1)

All core first-party tools (existing calc operations, VS Code extension tools, importers) continue to render with their expected category colours after the static `TOOL_ID_TO_CATEGORY` map is deleted. An analyst sees no visual change for the tools they already use day-to-day.

**Why this priority**: This is the "do no harm" safety net. The value of retiring the shim is zero if analysts lose icons on tools they relied on.

**Independent Test**: Record the set of tool-icon pairings shown in the Log Panel before the change (from a representative fixture session). Apply the change. Compare the rendered icons for every entry — every previously-coloured icon must remain coloured, and with the same category.

**Acceptance Scenarios**:

1. **Given** the 16 tool IDs currently enumerated in `TOOL_ID_TO_CATEGORY`, **When** the Log Panel renders entries for each of them after the shim is removed, **Then** each card icon shows the same category colour and glyph it showed before.
2. **Given** a regression-fixture log session used in Log Panel tests, **When** the view is rendered against the new manifest-lookup implementation, **Then** the visual diff against a baseline screenshot is empty (or limited to intentional changes such as newly-coloured icons that were previously grey).

---

### User Story 4 - Invalid or unknown category values fail closed, not open (Priority: P2)

If a tool declares a visual category value that is not one of the five allowed buckets (for example a typo like `calcs` or a bespoke value like `geometry`), the Log Panel does not crash, does not render a broken icon, and does not silently masquerade as a known category. It falls back to the neutral-grey "Other" style, and the misdeclaration is surfaced to developers through logging and CI.

**Why this priority**: Manifest data crosses process boundaries (Python → JSON → TypeScript). Without a defensive fallback, a typo in one tool's manifest could break icon rendering for every card in a session.

**Independent Test**: Inject a synthetic tool-manifest entry with an invalid category value into the pipeline. Verify the Log Panel renders the card with the grey fallback and emits a dev-visible warning. Verify CI for first-party tools catches the misdeclaration.

**Acceptance Scenarios**:

1. **Given** a manifest entry declaring `"category": "geometry"` (not one of the five allowed values), **When** the Log Panel renders the corresponding entry, **Then** the card icon uses the neutral-grey fallback and other cards render normally.
2. **Given** the same misdeclaration, **When** a developer runs the project's type-check or test suite, **Then** the invalid value is reported (via schema validation, typed enum, or a dedicated lint/test).

---

### Edge Cases

- **Tool with no manifest entry at all** — A log entry references a `toolName` that does not appear in the manifest delivered to the webview. Behaviour: neutral-grey fallback, identical to today's behaviour for un-listed tools. No error.
- **Tool manifest arrives after the first render** — The Log Panel renders entries before the manifest has loaded. Behaviour: entries render with the neutral-grey fallback, then re-render with correct colours once the manifest is available. No flashing of incorrect (non-grey) colours.
- **Tool rename / migration** — An old session contains entries for a tool name that has since been renamed. Behaviour: grey fallback for the historic name (until someone adds an alias or re-categorises the log); no crash.
- **Duplicate tool names across sources** — Two registries (e.g. calc and a contrib package) both declare a tool with the same ID but different visual categories. Behaviour: deterministic precedence — the first-party registry wins — and a developer-visible warning is logged.
- **Destructive / ambiguous operations** — `delete-features` is categorised as `style` in the current static map, which is semantically odd. Behaviour: preserved as-is in the migration so there is no visible user-facing change; a clean-up of such edge classifications is out of scope for this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool manifest MUST carry, for every registered tool, an optional visual-category field whose value is one of the five canonical buckets: `import`, `style`, `calc`, `filter`, `snapshot`.
- **FR-002**: Tool-registration surfaces in both Python (`services/calc`) and TypeScript (VS Code extension tools under `apps/vscode/src/tools/`) MUST accept the visual category as part of the tool's declared metadata, at the point a tool is authored.
- **FR-003**: Every first-party tool in the repository (calc + VS Code extension) MUST declare a visual category consistent with its prior static-map entry, or — for tools not currently in the static map — a category chosen by the author.
- **FR-004**: Tool metadata delivered to the Log Panel webview MUST include the visual category for each tool, alongside the existing hierarchical category / selection-requirement annotations.
- **FR-005**: The Log Panel MUST resolve an entry's icon appearance by looking up the tool's manifest-declared visual category, rather than consulting the hand-coded `TOOL_ID_TO_CATEGORY` map.
- **FR-006**: The static `TOOL_ID_TO_CATEGORY` map in `shared/components/src/LogPanel/toolCategories.ts` MUST be deleted once first-party tools declare their categories through the manifest path.
- **FR-007**: If a log entry references a tool for which no manifest-declared visual category is available (absent from manifest, manifest not yet loaded, or declared value not one of the five allowed buckets), the Log Panel MUST render the neutral-grey "Other" icon without throwing or logging an error to end-users.
- **FR-008**: Invalid visual-category values (not one of the five canonical buckets) MUST be detectable at development time — by type check, schema validation, or test — so that first-party misdeclarations do not ship silently.
- **FR-009**: Contrib / third-party tools declared through the documented extension path MUST render their icon using the declared category without requiring edits to code under `shared/components/`.
- **FR-010**: When the manifest delivers two entries with the same tool ID but different visual categories, the system MUST resolve the conflict deterministically (first-party precedence over contrib; within the same source, last-registered wins or error) and MUST log a developer-visible warning.
- **FR-011**: Existing tool-metadata consumers outside the Log Panel (tool-match, MCP annotations, CLI) MUST continue to work unchanged — adding the visual-category field MUST be additive, not a replacement for the existing `debrief:category` hierarchical path field.

### Key Entities *(include if feature involves data)*

- **Tool Manifest Entry**: The metadata record describing a single tool. Existing attributes include `name`, `description`, `version`, input/output kinds, selection requirements, and a hierarchical operational category (`debrief:category`, e.g. `track/styling`). This feature adds a new optional attribute for the tool's visual category, constrained to the five SRD-defined buckets.
- **Visual Category**: One of five canonical values — `import`, `style`, `calc`, `filter`, `snapshot` — defining the icon background colour and glyph shown on a Log Panel card. Distinct from, and additive to, the existing hierarchical operational category. A sixth "unknown" / neutral-grey state exists at the rendering layer as a fallback for tools that have not declared a value; this state is not a declarable category in the manifest itself.
- **Tool Manifest (delivered to Log Panel)**: The collection of tool-metadata entries that reach the Log Panel webview at runtime — today already produced by the `tools/list` path and cached by the VS Code extension. Becomes the single source of truth for visual-category lookup after this feature lands.

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis

- **Primary Goal**: Analysts and tool authors experience consistent, trustworthy icon colouring on every Log Panel card, without having to curate a separate component-library file every time a tool is added.
- **Key Decision(s)**:
  1. *(Tool author)* Which of the five visual categories best describes the new tool? (`import` / `style` / `calc` / `filter` / `snapshot`)
  2. *(Analyst, implicit)* Does the icon colouring match my intuition about this tool family? If the icon is grey, why?
- **Decision Inputs**: For tool authors — the SRD §5 category table (colour swatch + glyph + example tools) and the existing tool's hierarchical `debrief:category`. For analysts — the category colour itself, plus the tooltip / `aria-label` on the icon.

### Screen Progression

This is primarily a contract / data-flow change. From the analyst's perspective, the visual progression is identical to today, but more cards are correctly coloured:

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Log Panel open, session with mix of tools | Passive (reading the log) | Each card icon shows the colour and glyph of its manifest-declared category |
| 2 | Log Panel open, session containing a contrib or newly-added tool | Passive (reading the log) | The new tool's card icon is correctly coloured — previously grey |
| 3 | Log Panel open, session containing an entry whose tool is not in the manifest (historical / third-party unknown) | Passive (reading the log) | The card icon shows the neutral-grey "Other" style; other cards are unaffected |

### UI States

- **Empty State**: No change — when there are no log entries, the Log Panel empty state is unchanged.
- **Loading State**: When the manifest has not yet been delivered to the webview, entries render with the neutral-grey fallback icon and then update to the correct colour once the manifest arrives. No flashing of incorrect (non-grey) colours.
- **Error State**: If the manifest fails to load entirely, all cards render with the neutral-grey fallback — the panel remains functional; no error overlay or broken cards.
- **Success State**: Every card for which the manifest declares a visual category renders that category's colour and glyph; every card for which no declaration exists renders the neutral-grey fallback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this feature ships, a tool author can add a new tool with a coloured Log Panel icon by editing only the tool-registration site (one file) — verified by adding a throw-away test tool and inspecting the diff (single file touched, in `services/calc/` or `apps/vscode/src/tools/`).
- **SC-002**: 100% of first-party tools previously listed in `TOOL_ID_TO_CATEGORY` continue to render with the same category colour after the static map is removed — verified by a visual or data-level regression test comparing a baseline fixture render against the post-change render.
- **SC-003**: The file `shared/components/src/LogPanel/toolCategories.ts` no longer contains a hand-maintained list of tool IDs after this feature lands — verified by code search / diff inspection.
- **SC-004**: Tools registered under `contrib/` or added after this feature's merge commit get coloured icons in the Log Panel without any modification to files under `shared/components/` — verified by the tool-author workflow described in SC-001 and a dedicated contrib-path test.
- **SC-005**: A malformed or missing visual-category declaration on any single tool does not degrade the Log Panel for other cards — verified by an end-to-end test that injects an invalid declaration and asserts that only the misdeclared tool's card falls back to grey, while siblings render correctly.
- **SC-006**: Developer ergonomics: typos in the visual-category value are caught before merge — verified by demonstrating that a commit introducing `"category": "geometry"` (or any invalid value) on a first-party tool fails the project's standard `task verify` (lint + typecheck + test) gate.

## Assumptions

The following assumptions fill gaps not explicitly stated in the input or linked artefacts. Each is deliberate and should be challenged during `/speckit.clarify` if anyone disagrees.

- **A1 — Additive, not replacing**: The new visual-category field is *additive* to the existing `debrief:category` hierarchical path (e.g. `track/styling`, `reference/classification`). The hierarchical field is used by tool-match and other non-UI consumers; the new field is used only for Log Panel visual rendering. No existing consumer is expected to change.
- **A2 — Five buckets are fixed for MVP**: The allowed visual-category values are frozen at the five SRD buckets (`import`, `style`, `calc`, `filter`, `snapshot`). Expanding the set is explicitly out of scope for this feature and handled as a later conversation.
- **A3 — Optional at the schema level, required in practice for first-party**: The manifest schema declares the field as optional (null-valued tools fall back to grey). Project policy — enforced via test / lint — requires every first-party tool to declare a non-null value. Contrib tools are recommended to declare a value but may omit it.
- **A4 — Delivery mechanism reuses `tools/list`**: No new endpoint or message channel is introduced. The existing MCP `tools/list` response (already fetched by `calcService.listTools()`) is extended to carry the new field, and the Log Panel webview receives tool metadata through the same path it uses today for selection-requirement / parameter-schema information.
- **A5 — No session-data migration needed**: Historical log entries carry only a `toolName`; they do not carry a category. Therefore no migration of persisted session state is required — categories are resolved at render time from the live manifest.
- **A6 — `delete-features` stays as `style`**: The current static map categorises `delete-features` as `style`, which is semantically questionable. This feature preserves the existing mapping to avoid visible behaviour change; re-categorising destructive operations is a separate conversation.
- **A7 — Glyph and colour palette are unchanged**: The five (category → colour, glyph) bindings remain exactly as declared in SRD §5 and the existing `TOOL_CATEGORY_CONFIGS`. Only the *lookup path* changes.

## Out of Scope

- Expanding the visual-category taxonomy beyond the five SRD buckets.
- Re-categorising semantically-questionable tools (e.g. `delete-features`).
- Changing any non-Log-Panel consumer of tool metadata.
- Adding a user-facing preference or override for icon colours.
- Migrating historical session-state files.

## Dependencies

- **Feature #176** (Analysis Log Panel — Rich Card UX): the current static shim and the five-category design come from here.
- **Tool Manifest / Tool Registration Contract**: the Python `@tool` decorator in `services/calc/debrief_calc/registry.py` and the TypeScript tool declarations under `apps/vscode/src/tools/` already emit `debrief:category` annotations in MCP tool responses. This feature extends that contract.
- **MCP `tools/list` pipeline**: the existing plumbing from `calcService.listTools()` through `mcp-types.ts` delivers tool metadata to the webview.
