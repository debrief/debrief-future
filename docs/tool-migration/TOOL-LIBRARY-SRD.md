# Tool Library Migration — Software Requirements Document

> **Purpose**: Task brief for a Claude Code session running in the **legacy `debrief/debrief` repo**.
> The objective is to scan the legacy Java codebase and produce a library of **language-agnostic tool specifications** that can later drive Python and TypeScript implementations in the `debrief-future` repo.

## 1. Background

Future Debrief separates tool *specification* from tool *implementation*. Each tool is defined by a language-neutral spec (Markdown + pseudocode + golden I/O examples) that lives in `debrief-future/shared/tools/`. Implementations are generated mechanically from these specs.

Four tools have already been migrated as proof-of-concept:

| Tool | Category | Spec |
|------|----------|------|
| `set-track-color` | `track/styling` | `shared/tools/track/styling/set-track-color.1.0.md` |
| `apply-symbol-style` | `track/styling` | `shared/tools/track/styling/apply-symbol-style.1.0.md` |
| `label-interval` | `track/styling` | `shared/tools/track/styling/label-interval.1.0.md` |
| `symbol-interval` | `track/styling` | `shared/tools/track/styling/symbol-interval.1.0.md` |

This SRD governs the production of specs for the remaining migrateable tools.

## 2. Scope

### In scope

- **Discover** all analysis, formatting, and data-manipulation tools in the legacy Java source.
- **Categorise** them by domain (`track/styling`, `track/analysis`, `sensor/calibration`, etc.).
- **Classify trigger types** — record how each tool is invoked in legacy Eclipse RCP (context menu, toolbar, drag-drop, property edit, wizard, etc.) and what selection context it requires.
- **Map UX integration** — for each legacy trigger type, identify how the tool will be surfaced in Future Debrief (MCP/LLM, VS Code command, webview panel) and flag gaps where no clean equivalent exists.
- **Assess complexity** (Low / Medium / High) for each tool.
- **Capture golden I/O** — run each tool in the Java environment and serialize input/output as JSON fixture pairs.
- **Write language-neutral specs** following the `TEMPLATE.md` structure (9 required sections).

### Out of scope

- Python or TypeScript implementation (handled later by `/tool.implement` in `debrief-future`).
- UI-only actions with no algorithmic content (e.g., menu wiring, dialog launchers).
- Tools that are purely Eclipse RCP plumbing (preference pages, view factories).

## 3. Definitions

| Term | Meaning |
|------|---------|
| **Tool spec** | A Markdown document following `shared/tools/TEMPLATE.md` that fully describes a tool's behaviour without any language-specific code. |
| **Golden example** | A matched pair of `{tool}.{case}.input.json` and `{tool}.{case}.output.json` files capturing the exact input/output of the legacy Java tool. |
| **Discovery report** | A Markdown inventory table of all migrateable tools found in the legacy source. |
| **Pseudocode** | Language-neutral algorithm description using the keywords defined in the template (FUNCTION, FOR EACH, IF/ELSE, RETURN, etc.). |
| **ToolResponse** | The standard output envelope for all Future Debrief tools — an array of annotated content items with provenance metadata. |

## 4. Inputs

### 4.1 Legacy Java source

The `debrief/debrief` repository. Key packages to scan:

| Package pattern | Likely content |
|----------------|----------------|
| `org.mwc.debrief.core.actions.*` | Track formatting, styling actions |
| `org.mwc.debrief.track.actions.*` | Track manipulation tools |
| `org.mwc.cmap.analysis.*` | Analysis calculators (CPA, range/bearing) |
| `org.mwc.debrief.core.tools.*` | General tools |
| `Debrief/wrappers/track/*` | Track algorithms (smoothing, interpolation) |

### 4.2 Identification patterns

Classes to consider:
- Implementing `IAction`, `AbstractAction`
- Ending in `Tool`, `Action`, `Analyzer`, `Calculator`
- Public methods taking `Layers`, `TrackWrapper`, `WatchableList`, or `FeatureCollection` parameters

### 4.3 Available infrastructure in `debrief-future`

| Artifact | Location | Purpose |
|----------|----------|---------|
| Spec template | `shared/tools/TEMPLATE.md` | 9-section structure for every tool spec |
| Java capture harness | `docs/tool-migration/java-harness-template/` | Template for extracting golden I/O from Java |
| Discovery command | `/tool.discover` | Scans Java source, writes discovery report |
| Spec command | `/tool.spec` | Generates spec from Java analysis + golden I/O |
| Verify command | `/tool.verify` | Validates implementations against golden examples |
| Example specs | `shared/tools/track/styling/*.md` | Four completed specs to use as reference |

## 5. Outputs

### 5.1 Discovery report

**Location**: `docs/tool-migration/discovery-report.md`

A Markdown table listing every identified tool with:

| Column | Description |
|--------|-------------|
| Name | Kebab-case identifier (e.g., `range-bearing-calc`) |
| Category | Domain path (e.g., `track/analysis`) |
| Java Class | Fully-qualified class name |
| Complexity | Low / Medium / High |
| Legacy Trigger | How the tool is invoked in Eclipse RCP (see §5.4) |
| Selection Context | What must be selected/active for the tool to be available |
| Has Intermediate UI | Whether the tool shows a dialog/wizard before executing |
| Description | One-line summary of what the tool does |
| Status | Ready / Needs Review / Out of Scope |

### 5.1.1 Trigger type summary

The discovery report must include a summary counting tools by legacy trigger type, plus a **UX integration mapping table** that maps each legacy trigger type to Future Debrief surfaces (MCP/LLM tool, VS Code command, webview panel, context menu) and explicitly flags gaps where no clean equivalent exists.

### 5.1.2 Legacy trigger types

| Trigger Type | Eclipse RCP Pattern |
|--------------|---------------------|
| `context-menu` | Right-click popup on selection in plot or outline view |
| `toolbar-button` | Global or view-local toolbar button |
| `menu-bar` | Top-level menu item (Edit, Analysis, etc.) |
| `drag-drop` | Mouse drag on plot (track shifting, TMA) |
| `property-edit` | Value change in properties panel |
| `wizard` | Multi-step dialog with sequential pages |
| `key-binding` | Keyboard shortcut |
| `auto/listener` | Fired automatically by data changes |
| `view-action` | Button/control inside a custom view |
| `bulk/batch` | Applied to multiple items in a loop |

### 5.2 Golden example files

**Location**: `shared/tools/{category}/{tool-name}.{case}.{input|output}.json`

Requirements per tool:
- **Minimum 1 example** (`basic`) for Low-complexity tools.
- **Minimum 3 examples** (`basic`, `empty`/`edge`, `complex`) for Medium/High-complexity tools.

File format:
- Input: the data the Java tool receives (as GeoJSON FeatureCollection or structured JSON).
- Output: the data the Java tool produces (as ToolResponse envelope or raw GeoJSON — will be normalised during `/tool.spec`).

### 5.3 Tool specifications

**Location**: `shared/tools/{category}/{tool-name}.1.0.md`

Each spec must contain all 9 sections defined by TEMPLATE.md:

1. **Metadata** — YAML frontmatter: `name`, `version`, `category`, `status`, `migrated_from`
2. **MCP** — LLM-optimized description, when-to-use, parameters, returns
3. **Inputs** — Schema references, constraints, defaults
4. **Outputs** — ToolResponse structure, result type path, annotations
5. **Algorithm** — Language-neutral pseudocode (no Java, no Python, no TypeScript)
6. **Edge Cases** — Table of boundary conditions and expected behaviour
7. **Examples** — Inline JSON examples + references to golden files
8. **Changelog** — Version history
9. **References** — Related tools, schemas, legacy Java class

### 5.4 Category directory structure

```
shared/tools/
├── TEMPLATE.md
├── track/
│   ├── styling/          # colour, symbols, labels, intervals
│   ├── analysis/         # CPA, intercept, frequency
│   ├── manipulation/     # smoothing, interpolation, trimming
│   └── measurement/      # range, bearing, speed
├── sensor/
│   ├── calibration/      # bias estimation, offset correction
│   └── analysis/         # coverage, detection
├── dataset/
│   └── export/           # CSV, clipboard, report generation
├── spatial/
│   └── geometry/         # area, distance, polygon ops
└── narrative/
    └── formatting/       # timeline annotations, bookmarks
```

Categories should be refined during discovery. The above is a starting hypothesis.

### 5.5 UX integration mapping

The discovery report must include a table mapping each legacy trigger type to
its Future Debrief equivalents, flagging gaps that need new UX design:

| Legacy Trigger | MCP/LLM Tool | VS Code Command | Webview Panel | Context Menu | Gap? |
|----------------|-------------|-----------------|---------------|-------------|------|
| `context-menu` | Yes | Yes | Possible | Yes | No |
| `toolbar-button` | Yes | Yes | Yes | N/A | No |
| `menu-bar` | Yes | Yes | N/A | N/A | No |
| `drag-drop` | No | No | Possible (Leaflet) | No | **Yes** |
| `property-edit` | Partial | Partial (input box) | Yes (panel) | N/A | Partial |
| `wizard` | Partial (multi-turn) | Partial (multi-step pick) | Yes (stepper) | N/A | **Yes** |
| `key-binding` | N/A | Yes | Possible | N/A | No |
| `auto/listener` | Yes (chaining) | Yes (events) | Yes (reactive) | N/A | No |
| `view-action` | N/A | Possible | Yes | N/A | No |
| `bulk/batch` | Yes (loop) | Yes (multi-select) | Yes (apply-all) | N/A | No |

Tools whose legacy trigger has a gap must be listed in a "Tools Requiring New
UX Mechanisms" section of the discovery report with a brief note on what
alternative UX approach might work.

## 6. Process

### Phase 1: Discovery

1. Run `/tool.discover` against the legacy source tree.
2. For each tool, classify its legacy trigger type(s), selection context, and whether it shows intermediate UI.
3. Populate the UX integration mapping table; flag tools with trigger gaps.
4. Review the generated discovery report.
5. Manually triage: mark tools as **Ready**, **Needs Review**, or **Out of Scope**.
6. Prioritise by complexity (Low first, then Medium, then High).

### Phase 2: Golden I/O capture

For each **Ready** tool:

1. Copy `ToolCaptureHarness.java` into the legacy project's test source.
2. Add Gson dependency from `pom-fragment.xml`.
3. Write a capture test that:
   - Constructs representative input data.
   - Executes the legacy tool.
   - Serializes input and output to JSON.
4. Run the capture test.
5. Place output files in `shared/tools/{category}/`.

**Capture guidelines**:
- Serialize floating-point values with full precision.
- Use UTC timestamps consistently.
- Ensure collections have deterministic ordering.
- Capture at least the cases listed in §5.2.

### Phase 3: Specification authoring

For each tool with golden I/O:

1. Run `/tool.spec {tool-name}` (or write manually following TEMPLATE.md).
2. Review the generated spec against the Java source:
   - Does the pseudocode faithfully represent the algorithm?
   - Are all edge cases documented?
   - Do the golden file references resolve?
3. Ensure the `migrated_from` field in metadata points to the legacy Java class.

### Phase 4: Validation checkpoint

Before considering a tool "spec-complete":

- [ ] Spec follows TEMPLATE.md structure (all 9 sections present).
- [ ] Pseudocode uses only approved keywords (no language-specific constructs).
- [ ] At least one golden example pair exists and is referenced.
- [ ] Result type path follows naming convention (`^[a-z_]+/[a-z_]+$`).
- [ ] Edge cases table has at least 5 entries.
- [ ] MCP section is clear enough for an LLM to decide when to invoke the tool.

## 7. Pseudocode conventions

All specs must use the pseudocode style defined in TEMPLATE.md:

### Keywords

```
FUNCTION / END FUNCTION
FOR EACH / END FOR
IF / ELSE / ELSE IF / END IF
WHILE / END WHILE
RETURN
```

### Operators

```
IN, IS NULL, IS NOT NULL, IS EMPTY
AND, OR, NOT
```

### Response builders

| Builder | Result type | When to use |
|---------|------------|-------------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Modifying existing features |
| `build_addition(features, subtype, sources, label)` | `addition/*` | Creating new derived features |
| `build_deletion(deleted_ids, subtype, sources, label)` | `deletion/*` | Removing features |
| `build_artifact(data, mime, subtype, sources, label, href)` | `artifact/*` | Producing non-GeoJSON output |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |
| `build_response(content_items)` | ToolResponse | Wrapping content for return |

### Result type naming

- Format: `{top_type}/{domain}/{specific_type}`
- Subtype (used in builders): `{domain}/{specific_type}`
- Constraints: lowercase, underscores (not hyphens), two segments required
- Pattern: `^[a-z_]+/[a-z_]+$`

## 8. ToolResponse structure

Every tool returns a `ToolResponse`:

```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://{feature-id}",
      "mimeType": "application/geo+json",
      "text": "{serialized GeoJSON Feature}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["input-feature-id"],
        "debrief:label": "Human-readable description"
      }
    }
  ]
}
```

Error responses:

```json
{
  "error": {
    "code": -32000,
    "message": "Description of what went wrong",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## 9. Agents available

When running `/tool.discover` and `/tool.spec` from Claude Code, these specialised agents are invoked automatically:

| Agent | Role | Used by |
|-------|------|---------|
| `legacy-tool-analyst` | Reads Java source, extracts algorithms, assesses complexity | `/tool.discover`, `/tool.spec` |
| `tool-spec-author` | Writes TEMPLATE-compliant specs from algorithm analysis | `/tool.spec` |
| `golden-example-validator` | Compares outputs with floating-point tolerance | `/tool.verify` |
| `tool-implementer` | Generates Python + TypeScript from specs | `/tool.implement` |

## 10. Acceptance criteria

### Per-tool acceptance

A tool is considered **spec-complete** when:

1. Its spec file exists at `shared/tools/{category}/{tool-name}.1.0.md`.
2. The spec contains all 9 TEMPLATE.md sections with non-placeholder content.
3. At least one golden example pair (`*.input.json` + `*.output.json`) exists.
4. The algorithm pseudocode contains no language-specific constructs.
5. The `migrated_from` metadata field references the legacy Java class.

### Library-level acceptance

The tool library is considered **complete** when:

1. The discovery report covers all analysed packages.
2. Every tool in the inventory has a legacy trigger type, selection context, and intermediate-UI flag.
3. The UX integration mapping table is populated and tools with trigger gaps are listed with proposed alternatives.
4. Every **Ready** tool has a spec-complete specification.
5. Tools are organised into a coherent category hierarchy.
6. A summary index exists listing all specs with their categories and status.

## 11. Non-functional requirements

- **Determinism**: Golden I/O captures must be reproducible. Avoid randomised data or non-deterministic ordering.
- **Precision**: Floating-point values in golden files must use full precision (no rounding). The verify step uses epsilon tolerance (1e-9).
- **Traceability**: Every spec must link back to its legacy Java class via `migrated_from` metadata.
- **Consistency**: All specs must use the same pseudocode vocabulary and ToolResponse structure.
- **Incrementality**: Tools can be migrated independently. No tool spec should depend on another tool being migrated first (shared utilities excepted).

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Java tool is tightly coupled to Eclipse UI | Cannot extract algorithm | Mark as Out of Scope; re-implement from domain knowledge |
| Complex tool has undocumented edge cases | Incomplete spec | Capture extra golden examples; consult domain experts |
| Legacy tool has bugs that golden I/O preserves | Spec encodes incorrect behaviour | Flag as `status: needs-review`; document known issues in spec |
| Floating-point differences between Java and target languages | Verification failures | Use epsilon tolerance; document precision requirements |
| Tool depends on external data (databases, files) | Cannot run in isolation for capture | Mock external dependencies in capture harness |
| Legacy trigger type has no Future Debrief equivalent (e.g., drag-drop, wizard) | Tool cannot be invoked by users | Flag in UX integration mapping; design alternative interaction before implementation |

## 13. Reference documents

| Document | Location (in `debrief-future`) |
|----------|-------------------------------|
| Tool spec template | `shared/tools/TEMPLATE.md` |
| Completed example spec | `shared/tools/track/styling/set-track-color.1.0.md` |
| Java capture harness | `docs/tool-migration/java-harness-template/` |
| Tool result architecture | `docs/TOOL-RESULTS.md` |
| Feature 049 spec (documentation model) | `specs/049-tool-documentation-model/spec.md` |
| Feature 050 spec (migration workflow) | `specs/050-tool-migration-workflow/spec.md` |
| Migration quickstart | `specs/050-tool-migration-workflow/quickstart.md` |
| Constitution | `CONSTITUTION.md` |
