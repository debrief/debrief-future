# Research: Review Technical Debt

**Feature**: 172-review-technical-debt
**Date**: 2026-03-20

## Research Questions & Findings

### RQ-1: What is the current dependency version skew?

**Decision**: Align all shared dependencies to the highest version currently in use across the monorepo.

**Rationale**: The highest version is already proven to work in at least one package. Aligning upward avoids regressions and ensures all packages benefit from the latest fixes.

**Findings**:

| Dependency | Current Range(s) | Target |
|---|---|---|
| `@storybook/*` | `^8.0.0` (loader) vs `^8.4.0` (components) | `^8.4.0` |
| `@typescript-eslint/*` | `^6.13.0` (vscode) vs `^6.21.0` (components) | `^6.21.0` |
| `eslint` | `^8.55.0` (vscode) vs `^8.57.1` (components) | `^8.57.1` |
| `eslint-plugin-react` | `^7.33.0` (loader) vs `^7.37.5` (components) | `^7.37.5` |
| `@types/leaflet` | `^1.9.0` (components, web-shell) vs `^1.9.8` (vscode) | `^1.9.8` |
| `pydantic` | `>=2.0.0` (6 services) vs `>=2.12.5` (root) | `>=2.12.5` |
| `ruff` | `>=0.1.0` (schemas, stac) vs `>=0.8.0` (root) | `>=0.8.0` |

**Alternatives considered**: Aligning to lowest version (rejected — would lose fixes already in use); pinning exact versions (rejected — overly rigid for a pre-release project under Article XIV).

---

### RQ-2: Where are the GeoJSONFeature duplicates and what should the canonical definition be?

**Decision**: Use `SafeFeature` from `@debrief/utils` as the canonical GeoJSON feature type. Remove all local `GeoJSONFeature` interface definitions.

**Rationale**: `SafeFeature` already exists in `shared/utils/src/types.ts` and is used at MCP boundaries. It has the right shape (`type: 'Feature'`, optional `id`, `SafeGeometry | null`, `properties: Record<string, unknown> | null`). The 19+ local copies differ only in minor ways (e.g., `coordinates: unknown` vs `coordinates: number[] | number[][] | number[][][]`).

**Findings**:
- 19 independent `GeoJSONFeature` definitions found across the codebase
- Concentrated in `apps/vscode/src/tools/` (10), `apps/web-shell/src/tools/` (5), plus session-state, loader, components, and diff
- `SafeFeature` is already the canonical type imported by calcService, stacService, and other services
- Minor shape differences exist but all are compatible with `SafeFeature`

**Alternatives considered**: Creating a new `GeoJSONFeature` type in `@debrief/schemas` (rejected — `SafeFeature` already exists and is well-established); keeping both `GeoJSONFeature` and `SafeFeature` (rejected — two names for the same concept causes confusion).

---

### RQ-3: How should TimeRange be unified?

**Decision**: Canonical `TimeRange` uses epoch milliseconds (`{ start: number; end: number }`), located in `@debrief/session-state`. Converter utilities handle ISO string and min/max formats.

**Rationale**: Feature #132 (three-view-sync) already decided on epoch milliseconds for performance. The session-state definition already uses this shape. Converters preserve backward compatibility.

**Findings**:
- 4 incompatible definitions:
  1. `{ start: number; end: number }` — session-state (epoch ms) ← canonical
  2. `{ start: string; end: string }` — specs/025 (ISO strings)
  3. `{ min: number; max: number }` — specs/131 (different field names)
  4. `{ start: string | Date; end: string | Date }` — specs/001 (union type)
- The specs/025, specs/131, and specs/001 definitions are in contract files that may not be in production code

**Alternatives considered**: ISO strings as canonical (rejected — worse performance for frequent comparisons); Date objects (rejected — not serialisable to JSON).

---

### RQ-4: Where should MCPToolDefinition live?

**Decision**: Move `MCPToolDefinition` to `@debrief/utils` (or `@debrief/schemas` if it's schema-derived). Remove the copy in `@debrief/components/ToolMatch`.

**Rationale**: `MCPToolDefinition` is a domain type, not a UI component type. Placing it in components forces service code to depend on a UI package. Both current copies are identical.

**Findings**:
- 2 identical definitions: `apps/vscode/src/types/tool.ts` and `shared/components/src/ToolMatch/mcpAdapter.ts`
- `mcpToolAdapter.ts` imports from components and shadows with local type
- Web-shell's `toolService.ts` imports types directly from vscode source (cross-app dependency)

**Alternatives considered**: Keep in components (rejected — creates cross-layer violation); keep in vscode (rejected — web-shell can't import from vscode).

---

### RQ-5: Which Python services are misaligned with workspace/tooling?

**Decision**: Add `services/session-state-py` and `services/debrief-tools` (if it exists as a directory) to uv workspace members. Add `debrief_cli` to ruff `known-first-party`.

**Rationale**: All Python services should be discoverable by the build system. The ruff config already lists `debrief_tools` and `debrief_session` as known-first-party, confirming they should be treated as internal packages.

**Findings**:
- **uv workspace members** (root pyproject.toml): schemas, stac, io, config, calc, cli
- **Missing from uv workspace**: session-state-py, debrief-tools
- **ruff known-first-party**: debrief_schemas, debrief_stac, debrief_io, debrief_config, debrief_calc, debrief_tools, debrief_session
- **Missing from ruff**: debrief_cli

---

### RQ-6: What ESLint configuration strategy should be used?

**Decision**: Use `.eslintrc.cjs` format consistently. Create configs for `shared/config-ts`, `shared/utils`, `apps/web-shell`, and `services/session-state` that extend a shared base configuration.

**Rationale**: `.eslintrc.cjs` is already used by 2 of 3 existing configs (components and loader). The `apps/vscode/.eslintrc.json` is the outlier. CJS format allows conditional logic and comments.

**Findings**:
- 3 existing ESLint configs: components (.cjs), vscode (.json), loader (.cjs)
- 4 packages missing ESLint: config-ts, utils, web-shell, session-state

**Alternatives considered**: Migrate to flat config (`eslint.config.mjs`) — rejected for now since ESLint 8 is in use and flat config is ESLint 9+; `.eslintrc.json` everywhere (rejected — .cjs is majority format and more flexible).

---

### RQ-7: Should the tsconfig module setting be unified?

**Decision**: Document the rationale for the three patterns rather than force alignment. The three patterns serve different environments.

**Rationale**: `ESNext` is correct for bundled browser targets (esbuild handles module resolution). `NodeNext` is correct for Node.js libraries that need proper ESM/CJS interop. `ES2022` in vscode is acceptable since it targets a specific VS Code runtime version.

**Findings**:
- `ESNext`: components, web-shell, loader (browser/bundled targets)
- `NodeNext`: config-ts, utils, session-state (Node.js libraries)
- `ES2022`: vscode, vscode webview (VS Code extension host target)

**Alternatives considered**: All `ESNext` (rejected — breaks Node.js library consumers); all `NodeNext` (rejected — unnecessary strictness for bundled targets).

---

### RQ-8: What coverage thresholds should be set?

**Decision**: Set 80% line coverage threshold for `debrief-config` and `debrief-calc`, matching the lowest existing threshold in the project (`debrief-session` uses 80%).

**Rationale**: 80% is a pragmatic minimum that catches regressions without blocking work on hard-to-test edge cases. Other services use 80-90%.

**Findings**:
- `debrief-stac`: 90% threshold
- `debrief-io`: 90% threshold
- `debrief-session`: 80% threshold
- `debrief-config`: no threshold
- `debrief-calc`: no threshold

---

### RQ-9: Cross-app dependency: web-shell imports from vscode

**Decision**: Move shared types (`MCPToolDefinition`, `MCPToolResponse`, `MCPContentItem`, `DebriefAnnotations`) to `@debrief/utils` so both apps import from a shared package.

**Rationale**: `apps/web-shell/src/services/toolService.ts` imports directly from `../../../vscode/src/types/tool` using a relative path. This is fragile, breaks with directory restructuring, and creates a hidden dependency between apps.

**Findings**:
- `toolService.ts` (web-shell) imports 4 types from vscode via relative path
- These are domain types that belong in a shared package
- No npm dependency exists between web-shell and vscode

**Alternatives considered**: Adding vscode as a dependency of web-shell (rejected — creates circular app dependency risk).
