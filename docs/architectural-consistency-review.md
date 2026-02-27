# Architectural Consistency Review

**Date:** 2026-02-27
**Scope:** Six-axis review of Future Debrief codebase against governing documents
**Method:** Static analysis only — no code changes, no test execution

---

## Finding Classification

| Category | Definition |
|----------|------------|
| **Constitutional violation** | Active breach of CONSTITUTION.md article |
| **Implementation drift** | Code diverged from its own governing doc without justification |
| **Documentation staleness** | Doc describes something unbuilt or abandoned |
| **Intentional divergence** | Documented or clearly justified deviation |

| Severity | Definition |
|----------|------------|
| **Blocking** | Must fix before next release milestone |
| **Significant** | Creates real risk of bugs or confusion; fix in current quarter |
| **Minor** | Cleanup item; no functional impact today |
| **Informational** | Noted for awareness; no action required |

---

## Axis 1: Constitution vs Reality

### F-1.1 Web-shell executes tools in-process (Art. IV.1)

**Category:** Intentional divergence
**Severity:** Informational

Art. IV.1 says "Services never touch UI" — Python services return data only. The web-shell's `toolService.ts` runs 12 TypeScript tool implementations directly in the browser with no service boundary. However, lines 2-17 carry an explicit disclaimer: "All tools run entirely in the browser (no Python backend required)." This is a Phase 0 demo expedient covered by Art. XIV (Pre-Release Freedom).

**Risk:** If this pattern survives into v4.0, it becomes a violation. Currently acceptable.

**Files:** `apps/web-shell/src/services/toolService.ts:2-17`

### F-1.2 Web-shell frontend persists via mock FS (Art. IV.2)

**Category:** Intentional divergence
**Severity:** Minor

Art. IV.2 says "Frontends never persist." `App.tsx` calls `mockFsAdapter.writeFile()` at lines 672 and 683 to write result layers into an in-memory mock filesystem for STAC tree rendering. The mock adapter (`apps/web-shell/src/mocks/fsAdapter.ts:115-118`) persists to an in-memory `Map` — no actual disk I/O.

**Risk:** Low — mock-only, no production code path depends on this.

**Files:** `apps/web-shell/src/App.tsx:672,683`, `apps/web-shell/src/mocks/fsAdapter.ts:115-118`

### F-1.3 MCP isolation is properly maintained (Art. IV.3)

**Category:** N/A — Compliant
**Severity:** Informational

`debrief_calc/models.py` has zero MCP imports. The `to_mcp_tool()` method on `Tool` generates an MCP-compatible dict using only Pydantic serialization. The actual MCP SDK import (`mcp.server`) lives exclusively in `debrief_calc/mcp/server.py:14-25` behind an optional `try/except ImportError` guard.

**Files:** `services/calc/debrief_calc/models.py`, `services/calc/debrief_calc/mcp/server.py:14-25`

### F-1.4 Schema single source of truth upheld (Art. II.1)

**Category:** N/A — Compliant
**Severity:** Informational

LinkML master schemas in `shared/schemas/src/linkml/` generate all TypeScript and Pydantic types. `Tool`, `SelectionRequirement`, `ToolParameter`, `FeatureKindEnum` all originate from `tool.yaml`. Generated TypeScript at `shared/schemas/src/generated/typescript/types.ts` matches LinkML definitions.

**Files:** `shared/schemas/src/linkml/tool.yaml`, `shared/schemas/src/generated/typescript/types.ts:1077-1122`

### F-1.5 Web-shell provenance on tool results (Art. III.1)

**Category:** Constitutional violation
**Severity:** Blocking

Art. III.1 requires "every transformation must record lineage." The web-shell's `toolService.ts:283-287` attaches `debrief:resultType`, `debrief:sourceFeatures`, and `debrief:label` as MCP response annotations — but does NOT attach a W3C PROV `LogEntry` to `feature.properties.provenance`. Once features leave the MCP response envelope, lineage is lost.

Python's executor (`executor.py:77-96`) correctly creates a `LogEntry` and appends it to each output feature's `properties.provenance[]`.

**Impact:** Web-shell tool outputs have no persistent provenance chain. Tool replay, parameter tuning audit, and downstream lineage queries all break.

**Disposition:** Must fix. Add LogEntry creation and attachment in TS executor, mirroring Python.

**Files:** `apps/web-shell/src/services/toolService.ts:258-303`, `services/calc/debrief_calc/executor.py:77-96`, `services/calc/debrief_calc/provenance.py:117-127`

---

## Axis 2: Tool Implementation Parity (Python vs TypeScript)

### F-2.1 Algorithm fidelity is strong

**Category:** N/A — Compliant
**Severity:** Informational

All three shared tools (`track-stats`, `range-bearing`, `area-summary`) use identical core algorithms:
- Haversine with Earth radius = 3440.065 nm
- Distance conversions: NM_TO_KM=1.852, NM_TO_MI=1.15078
- Bearing: standard atan2 formula
- Area: (dx * 60 * cos(avg_lat)) * (dy * 60)

### F-2.2 `kind` attribute values diverge

**Category:** Implementation drift
**Severity:** Blocking

Python sets `feature.properties.kind` to the tool's `output_kind` (e.g., `"track/statistics"`, `"region/statistics"`). TypeScript tools set kind to feature-type tokens (e.g., `"STATISTICS"`, `"DATASET"`, `"RECTANGLE"`).

| Tool | Python kind | TS kind |
|------|-------------|---------|
| track-stats | `track/statistics` | `STATISTICS` |
| range-bearing | `dataset/range_bearing_series` | `DATASET` |
| area-summary | `region/statistics` | `RECTANGLE` |

Consumers filtering by `kind` will get different results depending on which backend produced the feature.

**Disposition:** Must fix. Define canonical `kind` values in a central schema (LinkML) and propagate to both Python and TypeScript generated code. No hand-authored kind strings.

**Files:** `services/calc/debrief_calc/provenance.py:183-198` (Python setter), `apps/web-shell/src/tools/track/analysis/trackStats.ts:147`, `apps/web-shell/src/tools/track/analysis/rangeBearing.ts:139`, `apps/web-shell/src/tools/region/analysis/areaSummary.ts:126`

### F-2.3 TypeScript has no output validation

**Category:** Implementation drift
**Severity:** Significant

Python's `executor.py:96` calls `validate_tool_output()` which checks GeoJSON structure, kind presence, and provenance existence (`validation.py:88-178`). TypeScript has zero post-execution validation — invalid features pass through silently.

**Disposition:** Resolve. Add post-execution validation in TS toolService mirroring Python's `validate_tool_output()`.

**Files:** `services/calc/debrief_calc/executor.py:96`, `services/calc/debrief_calc/validation.py:88-178`

### F-2.4 `range-bearing` selection requirements diverge

**Category:** Implementation drift
**Severity:** Significant

Python accepts `["TRACK", "SHAPE"]` inputs with mixed-type handling (Track+Point, Track+Polygon via `_closest_point_on_polygon`). TypeScript requires exactly 2 TRACK features — no mixed-type support, no polygon projection.

**Disposition:** Resolve. Align both implementations to identical selection requirements and input handling.

**Files:** `services/calc/debrief_calc/tools/range_bearing.py`, `apps/web-shell/src/tools/track/analysis/rangeBearing.ts`

### F-2.5 `range-bearing` Python output is non-GeoJSON

**Category:** Implementation drift
**Severity:** Significant

Python returns `{"type": "range-bearing-series", "entries": [...]}` — not a valid GeoJSON Feature. TypeScript wraps the same data in a proper GeoJSON Feature with `__datasets` in properties. The Python output violates the project's GeoJSON-everywhere convention.

**Disposition:** Resolve. Align both implementations to return valid GeoJSON.

**Files:** `services/calc/debrief_calc/tools/range_bearing.py`, `apps/web-shell/src/tools/track/analysis/rangeBearing.ts`

### F-2.6 `area-summary` input semantics diverge

**Category:** Implementation drift
**Severity:** Significant

Python expects `context.bounds [minx, miny, maxx, maxy]` (REGION context with zone/region/polygon inputs). TypeScript extracts bbox from feature coordinates (accepts TRACK, POINT, RECTANGLE, CIRCLE). Same algorithm, different input contract.

**Disposition:** Resolve. Align both implementations to identical input semantics.

**Files:** `services/calc/debrief_calc/tools/area_summary.py`, `apps/web-shell/src/tools/region/analysis/areaSummary.ts`

### F-2.7 Nine TS-only tools have no Python equivalents (intentional)

**Category:** Intentional divergence
**Severity:** Informational

`set-track-color`, `apply-symbol-style`, `label-interval`, `symbol-interval`, `move-shape`, `generate-reference-points`, `generate-courses-speeds`, `buffer-zone-generator` are styling/manipulation tools that belong in the frontend layer per Art. IV.1. Python provides analysis/calc tools only. This is architecturally correct.

---

## Axis 3: State Management Divergence

### F-3.1 Drawing mode not using session-state store

**Category:** Implementation drift
**Severity:** Significant

Both frontends manage `drawingMode` as local React state:
- Web-shell: `App.tsx:169` — `useState<DrawingMode>(null)`
- VS Code: `mapView.tsx:58` — `useState<DrawingMode>(null)`

But session-state already provides `setDrawingMode()` in `spatial.ts:47-49`. Neither frontend uses it. This means drawing mode resets on webview re-render (VS Code) and isn't available to external consumers.

**Disposition:** Resolve. Wire both frontends to `session-state.setDrawingMode()`.

**Files:** `apps/web-shell/src/App.tsx:169`, `apps/vscode/src/webview/web/mapView.tsx:58`, `services/session-state/src/store/slices/spatial.ts:47-49`

### F-3.2 VS Code palette index bypasses store

**Category:** Implementation drift
**Severity:** Minor

Web-shell correctly uses `session-state.drawingPaletteIndex` (`App.tsx:504,522`). VS Code uses local `useState(0)` (`mapView.tsx:60,228`). Palette resets when VS Code webview is recreated.

**Disposition:** Resolve. Use `session-state.drawingPaletteIndex` in VS Code mapView.

**Files:** `apps/web-shell/src/App.tsx:504,522`, `apps/vscode/src/webview/web/mapView.tsx:60,228`

### F-3.3 Result layers have different lifecycles

**Category:** Implementation drift
**Severity:** Significant

Web-shell accumulates result layers in persistent app state (`App.tsx:144,658`). VS Code holds them in ephemeral webview state (`mapView.tsx:44,123-134`), driven by extension messages. Neither persists to STAC.

Previously considered intentional, but undocumented and inconsistent. SessionManager has no result-layer API to support persistence.

**Disposition:** Resolve. Unify result layer lifecycle management across both frontends.

**Files:** `apps/web-shell/src/App.tsx:144,658`, `apps/vscode/src/webview/web/mapView.tsx:44,123-134`

### F-3.4 Selection state: store-driven vs message-driven

**Category:** Intentional divergence
**Severity:** Informational

Web-shell reads `session-state.features.selection` directly (`App.tsx:214-216`). VS Code webview receives selection via `postMessage` from extension host (`mapView.tsx:99-100`). This is correct for VS Code's extension/webview architecture but should be documented.

### F-3.5 Tool-level undo only in web-shell

**Category:** Implementation drift
**Severity:** Significant

Web-shell implements full tool undo via Log Service (`App.tsx:335-346`): revert to a prior log entry, restore pre-tool feature snapshots. VS Code only has UI-state undo (viewport, selection, etc.) via session-state's `UNDO_TRACKED_FIELDS`.

The Log Service exists in `session-state/src/log/index.ts` but VS Code never invokes it. This means VS Code users cannot undo tool executions.

**Disposition:** Investigate further to confirm VS Code is at fault, then resolve if confirmed. May require Log Service integration in VS Code extension.

**Files:** `apps/web-shell/src/App.tsx:335-346`, `services/session-state/src/store/index.ts:26-37`, `services/session-state/src/log/index.ts`

### F-3.6 MCP server in VS Code only

**Category:** Intentional divergence
**Severity:** Informational

VS Code runs an MCP HTTP server (`sessionManager.ts:378-395`) on port 3001 for Python tools to read/write session state. Web-shell has no MCP server — it executes tools in-process. This is correct: web-shell has no Python backend.

### F-3.7 Dirty tracking infrastructure unused in web-shell

**Category:** Implementation drift
**Severity:** Minor

Both frontends track dirty state via `session-state/store/middleware/dirty.ts`. VS Code shows save prompts (`sessionManager.ts:296-326`). Web-shell reads and displays dirty state (`App.tsx:1001`) but has no save UI or save flow.

---

## Axis 4: TOOL-RESULTS.md vs Implementation

### F-4.1 Persistence flow is documented-but-unbuilt

**Category:** Documentation staleness
**Severity:** Significant

TOOL-RESULTS.md specifies: "Frontend iterates content array, interprets `debrief:resultType`, calls appropriate atomic STAC operation (`update_features`, `add_features`, `delete_features`, `store_artifact`)."

Neither frontend does this:
- VS Code creates in-memory result layers (`calcService.ts:342-416`) but never calls STAC operations
- Web-shell writes to mock FS (`App.tsx:672,683`) — not the specified STAC API
- The Electron loader has `addFeatures()` calling debrief-stac (`apps/loader/src/main/ipc/stac.ts:127-150`) but only during file import, not after tool execution

**Impact:** Tool results exist only in frontend memory. No durable persistence, no STAC catalog update, no audit trail via STAC operations.

**Disposition:** Deferred. The calculated results handling strategy is still maturing. Revisit once the persistence approach is settled.

**Files:** `apps/vscode/src/services/calcService.ts:342-416`, `apps/web-shell/src/App.tsx:672,683`, `apps/loader/src/main/ipc/stac.ts:127-150`

### F-4.2 Web-shell resultType annotation uses wrong format

**Category:** Implementation drift
**Severity:** Minor

TOOL-RESULTS.md requires `debrief:resultType` to be a hierarchical path like `addition/track/reconstructed` or `mutation/track/smoothed`. Web-shell copies `debrief:outputKind` from tool definitions (e.g., `track/statistics`) — missing the top-level type prefix (`addition/`, `mutation/`, etc.).

**Disposition:** Resolve. Align annotation format with TOOL-RESULTS.md spec.

**Files:** `apps/web-shell/src/services/toolService.ts:284`, `apps/web-shell/src/tools/track/analysis/trackStats.ts:64`

### F-4.3 Provenance field naming inconsistency flagged in plan

**Category:** Implementation drift
**Severity:** Minor

Python uses `feature.properties.provenance` (array) with camelCase JSON aliases (`activityId`, `wasGeneratedBy`). The original plan flagged `properties.prov` vs `properties.provenance` as a potential conflict. Implementation uses `provenance` consistently, but the naming should be validated against TOOL-RESULTS.md to ensure doc and code agree.

**Disposition:** Resolve. Confirm canonical field name in TOOL-RESULTS.md and ensure all references align.

**Files:** `services/calc/debrief_calc/provenance.py:117-127`, `docs/TOOL-RESULTS.md`

### F-4.4 Python result_builder emits all required annotations

**Category:** N/A — Compliant
**Severity:** Informational

`build_mutation()` (line 39-43), `build_addition()` (71-75), `build_deletion()` (98-103), and `build_artifact()` (125-129) all emit `debrief:resultType`, `debrief:sourceFeatures`, `debrief:label`. Deletions add `debrief:deletedFeatures`; artifacts add `debrief:href`.

**Files:** `services/calc/debrief_calc/result_builder.py:39-129`

### F-4.5 `diffFeatureCollections()` exists and is correct

**Category:** N/A — Compliant
**Severity:** Informational

Implemented at `shared/components/diff/src/diffFeatureCollections.ts:43-81`. Returns `{ added, removed, modified }`. Uses feature ID matching and JSON comparison.

### F-4.6 Error structure matches spec

**Category:** N/A — Compliant
**Severity:** Informational

`build_error()` at `result_builder.py:151-168` emits `debrief:errorCategory` (validated against `invalid_input|algorithm_failure|resource_not_found`) and `debrief:affectedFeatures`. Matches TOOL-RESULTS.md error spec.

---

## Axis 5: Schema-Code Type Alignment

### F-5.1 VS Code `types/tool.ts` extends schema types

**Category:** Implementation drift
**Severity:** Significant

VS Code's hand-authored `types/tool.ts` extends the schema-generated `Tool` interface:
- Adds `minFeatures`, `parameters` to `Tool` (not in LinkML)
- Renames `type` → `valueType`, `default_value` → `defaultValue` in `ToolParameter`
- Adds `choices` to `ToolParameter`
- Omits `segment_type` from `SelectionRequirement`

**Risk:** If someone imports VS Code types as canonical (instead of `@debrief/schemas`), they get a superset. No safeguard prevents this.

**Disposition:** Resolve. No legacy code to support pre-release — refactor tool type definitions to be consistent across all layers. VS Code should use schema-generated types, extending via TypeScript `extends`/intersection if additional fields are needed, not shadowing.

**Files:** `apps/vscode/src/types/tool.ts:12-60`, `shared/schemas/src/generated/typescript/types.ts:1077-1122`

### F-5.2 Two `mcpAdapter` files serve different roles

**Category:** Implementation drift
**Severity:** Significant

`shared/components/src/ToolMatch/mcpAdapter.ts` converts MCP tool definitions to ToolMatchService format (shared). `apps/vscode/src/services/mcpToolAdapter.ts` converts MCP definitions to VS Code's extended tool types. Different consumers, different output shapes.

**Disposition:** Resolve. Aim for a single consistent adapter implementation rather than supporting divergent implementations. Once F-5.1 unifies the type definitions, the VS Code adapter should be eliminated or consolidated with the shared one.

**Files:** `shared/components/src/ToolMatch/mcpAdapter.ts`, `apps/vscode/src/services/mcpToolAdapter.ts`

---

## Axis 6: Cross-Ecosystem Dependency Contracts

### F-6.1 Health checks implemented correctly

**Category:** N/A — Compliant
**Severity:** Informational

`calcService.checkAvailability()` (lines 130-147) performs two-stage validation: Python interpreter then debrief_calc import. `ioService.checkAvailability()` (lines 131-145) similarly checks debrief-io. Both run on activation.

**Files:** `apps/vscode/src/services/calcService.ts:130-147`, `apps/vscode/src/services/ioService.ts:131-145`

### F-6.2 Structured logging in place

**Category:** N/A — Compliant
**Severity:** Informational

Centralized output channel (`extension.ts:37`) wired to both services. Logged events include paths, versions, error messages.

### F-6.3 Status indicators working

**Category:** N/A — Compliant
**Severity:** Informational

Status bar item with dynamic icons: `$(sync~spin)` (loading), `$(check)` (healthy), `$(warning)` (degraded), `$(error)` (unavailable). Click opens output channel.

### F-6.4 Actionable error messages present

**Category:** N/A — Compliant
**Severity:** Informational

Error messages include the failing path and remediation hint (e.g., "Set debrief.calc.pythonPath in settings or ensure a .venv exists").

### F-6.5 Periodic heartbeats missing

**Category:** Implementation drift
**Severity:** Significant

ARCHITECTURE.md requires: "re-validate availability periodically rather than assuming persistence." The circuit breaker (`calcService.ts:92-93,422-434`) prevents cascading failures but has no proactive re-check. After initial activation success, if debrief-calc becomes unavailable (venv deleted, package uninstalled), the extension won't detect this until the next tool execution attempt. Status bar stays green.

**Files:** `apps/vscode/src/services/calcService.ts:92-93,422-434`

---

## Summary: All Findings by Severity

### Blocking (2)

| ID | Finding | Category | Disposition |
|----|---------|----------|-------------|
| F-1.5 | Web-shell tool results lack feature-level provenance (Art. III.1) | Constitutional violation | **Must fix** |
| F-2.2 | `kind` attribute values diverge between Python and TypeScript | Implementation drift | **Must fix** — define in LinkML, propagate |

### Significant (11)

| ID | Finding | Category | Disposition |
|----|---------|----------|-------------|
| F-2.3 | TypeScript has no output validation | Implementation drift | Resolve |
| F-2.4 | `range-bearing` selection requirements diverge | Implementation drift | Resolve — align implementations |
| F-2.5 | Python `range-bearing` output is non-GeoJSON | Implementation drift | Resolve |
| F-2.6 | `area-summary` input semantics diverge | Implementation drift | Resolve — align implementations |
| F-3.1 | Drawing mode not using session-state store in either frontend | Implementation drift | Resolve |
| F-3.3 | Result layers have different lifecycles | Implementation drift | Resolve — unify |
| F-3.5 | Tool-level undo only in web-shell; VS Code has no tool replay | Implementation drift | Investigate, then resolve if confirmed |
| F-4.1 | Persistence flow documented but unbuilt — tool results never reach STAC | Documentation staleness | **Deferred** — revisit when results strategy matures |
| F-5.1 | VS Code `types/tool.ts` extends schema types — no legacy to support | Implementation drift | Resolve — refactor for cross-layer consistency |
| F-5.2 | Two `mcpAdapter` files diverge | Implementation drift | Resolve — consolidate after F-5.1 |
| F-6.5 | Periodic heartbeats missing for cross-ecosystem dependencies | Implementation drift | Resolve |

### Minor (5)

| ID | Finding | Category | Disposition |
|----|---------|----------|-------------|
| F-1.2 | Web-shell frontend persists via mock FS (Art. IV.2, demo only) | Intentional divergence | No action |
| F-3.2 | VS Code palette index bypasses session-state store | Implementation drift | Resolve |
| F-3.7 | Web-shell dirty tracking has no save UI | Implementation drift | No action for now |
| F-4.2 | Web-shell resultType annotation missing type prefix | Implementation drift | Resolve |
| F-4.3 | Provenance field naming needs doc/code alignment check | Implementation drift | Resolve |

### Informational (8)

| ID | Finding | Category | Disposition |
|----|---------|----------|-------------|
| F-1.1 | Web-shell in-process tool execution (demo, Art. XIV) | Intentional divergence | No action |
| F-1.3 | MCP isolation properly maintained | Compliant | No action |
| F-1.4 | Schema single source of truth upheld | Compliant | No action |
| F-2.1 | Algorithm fidelity is strong | Compliant | No action |
| F-2.7 | Nine TS-only tools are intentionally frontend-only | Intentional divergence | No action |
| F-3.4 | Selection state architecture differs by platform (correct) | Intentional divergence | No action |
| F-3.6 | MCP server in VS Code only (correct) | Intentional divergence | No action |
| F-4.4-4.6 | Python result_builder, diffFeatureCollections, error structure all compliant | Compliant | No action |
| F-6.1-6.4 | Health checks, logging, status, error messages all implemented | Compliant | No action |

---

## Resolution Plan

### Tier 1: Must fix (blocking)

1. **F-1.5 (TS provenance)** — Add LogEntry creation and attachment in `toolService.ts` executor, mirroring Python's `create_log_entry()` + `attach_log_entry()`.

2. **F-2.2 (kind values)** — Define canonical `kind` attribute values in LinkML schema. Propagate generated constants to both Python and TypeScript. Remove all hand-authored kind strings.

### Tier 2: Resolve (significant)

3. **F-2.3 (TS validation)** — Add post-execution validation in TS toolService mirroring Python's `validate_tool_output()`.

4. **F-2.4 (range-bearing selection)** — Align both implementations to identical selection requirements and mixed-type input handling.

5. **F-2.5 (range-bearing output)** — Align both implementations to return valid GeoJSON.

6. **F-2.6 (area-summary input)** — Align both implementations to identical input semantics.

7. **F-3.1 (drawing mode)** — Wire both frontends to `session-state.setDrawingMode()`.

8. **F-3.3 (result layers)** — Unify result layer lifecycle management across both frontends.

9. **F-3.5 (tool undo)** — Investigate VS Code gap further. Resolve if confirmed at fault.

10. **F-5.1 + F-5.2 (type consistency)** — Refactor VS Code tool types to use schema-generated types. Consolidate mcpAdapter implementations.

11. **F-6.5 (heartbeats)** — Add periodic re-validation timer (e.g., every 5 minutes) in calcService.

### Tier 3: Minor fixes

12. **F-3.2** — Use `session-state.drawingPaletteIndex` in VS Code mapView.

13. **F-4.2** — Align resultType annotation format with TOOL-RESULTS.md spec.

14. **F-4.3** — Confirm canonical provenance field name in TOOL-RESULTS.md and align all references.

### Deferred

15. **F-4.1 (STAC persistence)** — Revisit once calculated results handling strategy matures.

### Document

16. **F-3.4, F-3.6** — Add notes to ARCHITECTURE.md explaining intentional state management asymmetries between VS Code and web-shell.
