# Technical Debt Assessment Guide

This document provides detailed instructions for auditing the Debrief Future codebase
for technical debt. It is tailored to this project's architecture (thick services/thin
frontends, schema-first, monorepo with Python + TypeScript), and is informed by an
initial audit conducted in March 2026.

Each section describes a **category of debt**, **how to detect it**, **specific signals
found in this codebase**, and **what information must be captured** so the debt can be
resolved.

---

## 1. Dependency Version Skew

### What to look for

When multiple packages in the monorepo declare the same dependency at different versions,
builds may succeed locally but produce subtle runtime differences, test flakes, or
incompatible type definitions.

### How to detect

```bash
# TypeScript — compare versions across all package.json files
grep -r '"@playwright/test"' --include='package.json' .
grep -r '"@sparticuz/chromium"' --include='package.json' .
grep -r '"typescript"' --include='package.json' .
grep -r '"@typescript-eslint/parser"' --include='package.json' .

# Python — compare floor versions across all pyproject.toml files
grep -r 'pydantic>=' --include='pyproject.toml' .
grep -r 'mcp>=' --include='pyproject.toml' .
```

### Known signals in this codebase

| Dependency | Versions found | Severity |
|------------|---------------|----------|
| `@sparticuz/chromium` | ^131.0.1 (root) vs ^143.0.4 (web-shell) | ✅ **Resolved** — aligned across all packages |
| `@playwright/test` | ^1.40.0 (components, loader) vs ^1.57.0 (root, web-shell) | ✅ **Resolved** — aligned across all packages |
| `typescript` | ^5.0.0 (shared/components/diff) vs ^5.3.x (everywhere else) | **High** — type definition incompatibility |
| `@typescript-eslint/parser` | ^6.13.0 vs ^6.21.0 | Medium |
| `@storybook/react` | ^8.0.0 vs ^8.4.0 | Medium |
| `pydantic` | >=2.0.0 (services) vs >=2.12.5 (root) | Medium — validation behaviour drift |

### What to capture for resolution

For each version skew found, record:

- **Dependency name** and the **versions declared** in each package
- **File paths** of every `package.json` or `pyproject.toml` that declares it
- **Which version is canonical** (usually the root workspace declaration)
- **Whether a breaking change exists** between the lowest and highest declared version
- **Risk**: does this dependency affect runtime behaviour, type definitions, or test infrastructure?

---

## 2. Configuration Drift (TypeScript, ESLint, Python tooling)

### What to look for

When different packages use different compiler options, lint rules, or strictness levels,
code that passes checks in one package may silently violate rules in another. Developers
working in one area form habits that break in another.

### How to detect

#### TypeScript

```bash
# Compare target, module, moduleResolution, strict flags across tsconfigs
find . -name 'tsconfig.json' -not -path '*/node_modules/*' \
  -exec echo "=== {} ===" \; -exec grep -E '"(target|module|moduleResolution|strict|noUncheckedIndexedAccess)"' {} \;
```

#### ESLint

```bash
# Find all ESLint configs and compare format and rule sets
find . -name '.eslintrc.*' -not -path '*/node_modules/*'
```

#### Python (ruff)

```bash
# Check ruff known-first-party list vs actual workspace members
grep 'known-first-party' ruff.toml
grep 'members' pyproject.toml
```

### Known signals in this codebase

**TypeScript compiler options are inconsistent:**

| Setting | apps/vscode | shared/components | apps/loader | shared/config-ts |
|---------|------------|-------------------|-------------|-----------------|
| target | ES2022 | ES2020 | ES2022 | ES2022 |
| module | ES2022 | ESNext | ESNext | NodeNext |
| moduleResolution | bundler | bundler | bundler | NodeNext |
| noUncheckedIndexedAccess | true | true | not set | not set |
| noImplicitOverride | true | not set | not set | not set |

✅ **Partially resolved:** A shared `tsconfig.base.json` now exists at the monorepo root.
All packages should extend it rather than redeclaring common options independently.
`noUncheckedIndexedAccess` has been intentionally relaxed in the base config — packages
that need stricter array-access checking should re-enable it locally rather than relying
on the base. The table above reflects the state before the base config was introduced;
re-run the detection commands to identify any packages that still don't extend the base.

**ESLint configs are inconsistent:**

- `apps/vscode` uses **type-aware rules** (`@typescript-eslint/recommended-requiring-type-checking`),
  enforces `explicit-function-return-type`, `no-floating-promises`, `strict-boolean-expressions`
- `apps/loader` **explicitly disables** `explicit-function-return-type`
- `shared/components` uses basic recommended rules only, no type-aware checking
- `apps/web-shell`, `shared/utils`, `shared/config-ts` have **no ESLint config at all**
- Config format varies: `.eslintrc.cjs` (CommonJS) vs `.eslintrc.json` (JSON)

**Python ruff config incomplete:**

- `ruff.toml` lists `known-first-party = ["debrief_schemas", "debrief_stac", "debrief_io"]`
- Missing from list: `debrief_config`, `debrief_calc`, `debrief_tools`, `debrief_session`
- Impact: import sorting treats half the internal packages as third-party

**Coverage thresholds differ:**

- `services/stac`, `services/io`: `fail_under = 90`
- `services/config`, `services/session-state-py`: `fail_under = 80`
- `shared/schemas`: no coverage configuration

### What to capture for resolution

- **File path** of each config file
- **Specific setting** that differs and its value in each package
- **Which package's config should be canonical** (typically the strictest that all packages can satisfy)
- **Migration cost**: how many existing violations would a stricter config surface?
  Run the stricter config against each package and count errors.

---

## 3. Cross-Layer Architectural Violations

### What to look for

The architecture mandates "thick services, thin frontends" and "services never touch UI".
Violations occur when:

- Frontend code (`apps/`, `shared/components/`) imports directly from service internals
- Service code imports UI types from component libraries
- Domain logic lives in frontend layers instead of services

### How to detect

```bash
# Check if VS Code extension services import from @debrief/components
grep -rn "from '@debrief/components'" apps/vscode/src/services/

# Check if services import from frontend packages
grep -rn "from '@debrief/components'" services/

# Check how many files in apps/ import from services/
grep -rn "from '.*services/" apps/vscode/src/ | grep -v '__tests__' | grep -v '.test.'

# Look for tool implementations in frontend layers
find apps/ -path '*/tools/*' -name '*.ts' | head -20
```

### Known signals in this codebase

**Service-to-UI coupling (violates "services never touch UI"):**

- `apps/vscode/src/services/calcService.ts` imports `DebriefFeature` from `@debrief/components`
  and takes `MapPanel` (a UI class) as a constructor dependency
- `apps/vscode/src/services/stacService.ts` imports `DebriefFeature` from `@debrief/components`
- These service classes cannot be tested without mocking UI components

**Frontend contains domain logic:**

- `apps/web-shell/src/tools/` contains full tool implementations (sensor detection,
  buffer zone generation, etc.) that should live in `services/calc/`
- `apps/vscode/src/commands/` directly orchestrates `CalcService` and `StacService`
  rather than going through an abstraction layer

### What to capture for resolution

- **File path and line number** of each violating import
- **Direction of violation**: service→UI, frontend→service-internal, or domain-logic-in-frontend
- **The type or function imported** and what it's used for
- **Proposed refactoring**: where the code should live instead, and what interface would
  replace the direct dependency
- **Blast radius**: how many other files import from the violating file (indicates cascading
  refactoring cost)

---

## 4. Type Duplication Outside the Schema Chain

### The legitimate type chain

This project uses a **schema-first** architecture where types flow:

```
LinkML (shared/schemas/src/) ──generates──▸ Pydantic (generated/python/)
                             ──generates──▸ TypeScript (generated/typescript/)
                             ──generates──▸ JSON Schema (generated/json-schema/)
```

Duplication **within** this chain is expected and correct. Duplication **outside** it — where
a developer hand-writes an interface that should come from the schema — is debt that will
cause parameter drift across Python and TypeScript as the schema evolves.

### What to look for

1. **Shadow definitions** — types defined locally that duplicate or redefine a schema type
2. **Parallel definitions** — the same concept typed independently in 2+ packages
3. **Types that should be in the schema but aren't** — concepts used across both languages
   that have no LinkML definition at all
4. **Generated files edited by hand** — modifications that will be overwritten on next generation

### How to detect

```bash
# Step 1: List all types the schema generates
grep -n 'export interface\|export type' shared/schemas/src/generated/typescript/types.ts

# Step 2: Find every interface/type declaration outside the schema package
grep -rn 'interface \|type ' --include='*.ts' --include='*.tsx' \
  apps/ shared/components/ shared/utils/ shared/config-ts/ services/ \
  | grep -v node_modules | grep -v '.test.' | grep -v '__tests__' | grep -v '.stories.'

# Step 3: For each type name found in Step 2, check if it also exists in the schema
# Example: if you find "interface TimeRange" in apps/vscode/src/types/plot.ts,
# check whether TimeRange is already generated from LinkML

# Step 4: Find same type name in multiple files
grep -rn 'interface GeoJSONFeature\b' --include='*.ts' .
grep -rn 'interface SafeFeature\b' --include='*.ts' .
grep -rn 'interface MCPToolDefinition\b' --include='*.ts' .
grep -rn 'interface TimeRange\b' --include='*.ts' .
grep -rn 'type Bounds\b' --include='*.ts' .

# Step 5: Check for hand-edited generated files (should have auto-generated headers)
head -5 shared/schemas/src/generated/typescript/types.ts
head -5 shared/schemas/src/generated/python/debrief_schemas/__init__.py

# Step 6: Find Python classes that might shadow schema models
grep -rn 'class.*BaseModel' --include='*.py' services/ | grep -v test | grep -v __pycache__
```

### Known signals in this codebase

#### Critical: GeoJSON types independently defined in 22+ files

`GeoJSONFeature` is the worst offender. Instead of a single canonical definition, each
package defines its own version with **structurally different shapes**:

| Location | `geometry.coordinates` type | `id` type |
|----------|---------------------------|-----------|
| `shared/utils/src/types.ts` | `number[] \| number[][] \| number[][][]` | `string?` |
| `services/session-state/src/types/results.ts` | `unknown` | `string \| number?` |
| `shared/components/src/ExerciseListView/types.ts` | via `GeoJSONGeometry` | not present |
| `apps/vscode/src/webview/messages.ts` | `unknown` | not present |

These definitions have **already diverged**. A feature created by one package may not
satisfy the type expectations of another.

`GeoJSONFeatureCollection` follows the same pattern across 4+ files.

#### Critical: SafeFeature / SafeGeometry / SafeFeatureCollection (4 copies)

Created to "avoid `any` from the geojson package", but duplicated across 4 files in the
same VS Code extension instead of being defined once:

1. `apps/vscode/src/types/tool.ts:198-214`
2. `apps/vscode/src/services/stacService.ts:46-56`
3. `apps/vscode/src/services/calcService.ts:71-78`
4. `apps/vscode/src/webview/messages.ts:15-29`

All currently identical, but any future edit to one copy won't propagate to the others.

#### Critical: TimeRange has conflicting definitions

```typescript
// apps/vscode/src/types/plot.ts:189 — uses ISO 8601 strings
interface TimeRange {
  start: string;    // ISO 8601
  end: string;      // ISO 8601
  dataStart: string;
  dataEnd: string;
}

// services/session-state/src/types/temporal.ts:58 — uses epoch milliseconds
interface TimeRange {
  start: number;    // epoch ms
  end: number;      // epoch ms
}
```

These are **structurally incompatible**. Code using one definition will silently produce
wrong results if given data shaped by the other.

#### High: MCPToolDefinition defined in 3 places

1. `shared/components/src/ToolMatch/mcpAdapter.ts:14`
2. `apps/vscode/src/types/tool.ts:478`
3. `apps/web-shell/` (inline in mock service)

#### High: Bounds type defined identically in 4 places

`type Bounds = [number, number, number, number]` appears in:
1. `shared/components/src/utils/types.ts:103`
2. `shared/utils/src/types.ts:29`
3. `apps/vscode/src/utils/bounds.ts:12`
4. `specs/130-map-spatial-filtering/contracts/catalog-overview-props.ts:22`

#### Medium: Schema types exist but are redefined locally

These types exist in `@debrief/schemas` but are re-declared in app code instead of imported:
- `TrackStyle`, `PointMetadataEntry`, `LogEntry`, `WasGeneratedBy`, `TuneAnnotation`,
  `ToolParameter`, `ParameterValue`, `SystemRecordProperties`, `StylePropertyDescriptor`

#### Medium: Python service models that may shadow schema

Services define their own Pydantic models in `services/*/models.py`. Some may overlap with
generated schema models:
- `services/config/src/debrief_config/models.py` — `Config`, `StoreRegistration`
- `services/stac/src/debrief_stac/models.py` — `PlotMetadata`, `CollectionSummaries`
- `services/calc/debrief_calc/models.py` — `Tool`, `ToolParameter`, `ToolResult`

#### Low: Generated files lack auto-generated headers

Neither `types.ts` nor `__init__.py` in the generated directories contain
"DO NOT EDIT" or "AUTO-GENERATED" markers. A developer could hand-edit a generated file
without realising their changes will be overwritten on next schema generation.

### What to capture for resolution

For each duplicated type, record:

- **Type name** and every **file path + line number** where it's independently defined
- **Structural diff**: are the definitions identical, compatible, or conflicting?
  (Use `diff <(grep -A20 'interface Foo' file1.ts) <(grep -A20 'interface Foo' file2.ts)`)
- **Which definition is canonical**: is this type in the schema? If so, all others are shadows.
  If not, should it be added to LinkML?
- **Consumers**: which files import from each definition? (determines migration blast radius)
- **Cross-language presence**: does this type need to exist in both Python and TypeScript?
  If yes, it belongs in LinkML. If TypeScript-only, it belongs in a shared TS package.
- **Resolution action**: one of:
  - **Add to LinkML** — type is cross-language; add to schema, generate, delete shadows
  - **Consolidate to shared package** — type is TS-only; define once in `@debrief/utils` or
    `@debrief/components`, delete shadows, update imports
  - **Import from schema** — type already exists in `@debrief/schemas`; change local
    definitions to imports

---

## 5. Weak Typing and Unvalidated Boundaries

### Why this matters

Strong typing is the mechanism that prevents parameter drift across Python and TypeScript.
When data crosses a language boundary (Python service → MCP → TypeScript frontend), type
safety is only as strong as the weakest point in the chain. Every `unknown`, `Any`,
`Record<string, unknown>`, or unvalidated `JSON.parse()` is a place where a field rename,
type change, or structural change in one language will silently corrupt data in the other.

### What to look for

**TypeScript weak typing patterns:**

| Pattern | What it means | Risk |
|---------|--------------|------|
| `as any` | Bypass type system entirely | Field mismatches undetected |
| `: any` in annotations | Parameter/return accepts anything | Callers can pass wrong shape |
| `unknown` without narrowing | "I don't know the type" | Properties accessed unsafely |
| `Record<string, unknown>` | Properties bag instead of interface | No field-level checking |
| `JSON.parse()` without validation | Returns implicit `any` | Malformed data accepted silently |
| `as SomeType` assertion | "Trust me, it's this shape" | Assertion not checked at runtime |
| `Function` type | Loose callable | Parameter count/types unchecked |
| `object` type | Anything non-primitive | No property access possible |

**Python weak typing patterns:**

| Pattern | What it means | Risk |
|---------|--------------|------|
| `Any` from typing | Bypass type checker | Pydantic won't validate the field |
| Bare `dict` / `list` | Unparameterised container | Element types unknown |
| `dict[str, Any]` | Values can be anything | JSON fields unvalidated |
| `# type: ignore` | Silence the type checker | Real errors hidden |
| `**kwargs` without TypedDict | Untyped keyword args | Callers can pass anything |
| Missing return annotation | Return type unknown | Callers guess at shape |

**Cross-boundary patterns (most dangerous):**

| Pattern | Risk |
|---------|------|
| Python returns `dict[str, Any]`, TypeScript does `JSON.parse() as Type` | Shape mismatch undetected |
| MCP tool receives `arguments: dict` without validation | Malformed input crashes at runtime |
| Feature properties typed as `Record<string, unknown>` | Property names/types drift silently |

### How to detect

```bash
# === TypeScript ===

# Direct any usage
grep -rn 'as any' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.d.ts'
grep -rn ': any\b' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.d.ts'

# Unknown without narrowing
grep -rn ': unknown' --include='*.ts' --include='*.tsx' . | grep -v node_modules

# Properties bags
grep -rn 'Record<string, unknown>' --include='*.ts' --include='*.tsx' . | grep -v node_modules

# Unvalidated JSON parsing
grep -rn 'JSON\.parse(' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v test

# Loose types
grep -rn ': Function\b\|: object\b' --include='*.ts' --include='*.tsx' . | grep -v node_modules

# === Python ===

# Any usage
grep -rn 'Any' --include='*.py' . | grep -v __pycache__ | grep -v node_modules

# Bare containers
grep -rn ': dict\b\|: list\b' --include='*.py' . | grep -v __pycache__ | grep -v test

# Type ignore
grep -rn 'type: ignore' --include='*.py' . | grep -v __pycache__

# === Cross-boundary ===

# MCP handlers receiving raw dicts
grep -rn 'arguments\.get\|arguments\[' --include='*.py' services/

# TypeScript consuming MCP responses without validation
grep -rn 'JSON\.parse.*as ' --include='*.ts' apps/
```

### Known signals in this codebase

#### Critical: 41 unvalidated `JSON.parse()` calls in production TypeScript

Every place where TypeScript parses JSON from a Python service uses a bare type assertion
(`as Type`) with no runtime validation. If a Python service changes a field name or type,
TypeScript will silently accept the wrong shape.

Key locations:
- `apps/vscode/src/services/calcService.ts` — 5 `JSON.parse()` calls for tool responses
- `apps/vscode/src/services/stacService.ts` — 5 `JSON.parse()` calls for STAC items
- `services/session-state/src/persistence/load.ts` — 2 `JSON.parse()` calls for saved state
- `shared/components/src/PanelWorkspace/layoutPersistence.ts` — layout state

#### Critical: MCP boundary is type-unsafe in both directions

**Python receiving MCP requests:**
```python
# services/calc/debrief_calc/mcp/server.py
features = arguments.get("features", [])  # list[dict[str, Any]] — no validation
params = arguments.get("params", {})       # dict[str, Any] — no validation
```

**TypeScript consuming MCP responses:**
```typescript
// apps/vscode/src/services/calcService.ts
const response = JSON.parse(stdout) as MCPToolResponse;  // no validation
```

A schema change on either side will not be caught until runtime failure.

#### Critical: MCP tool annotations use `dict[str, Any]` in Python, specific shape in TypeScript

Python:
```python
annotations=mcp_def["annotations"]  # dict[str, Any]
```

TypeScript expects:
```typescript
annotations: {
  'debrief:selectionRequirements': MCPSelectionRequirement[];
  'debrief:category': string;
  'debrief:version': string;
  'debrief:outputKind': string;
}
```

If a new annotation key is added in Python but not TypeScript (or vice versa), there is
no compile-time or runtime error — the data silently mismatches.

#### High: 226 instances of `unknown` as type annotation in TypeScript

`unknown` is safer than `any` (which is good), but without type narrowing it provides no
field-level safety. The most impactful instances are in geometry handling:

- `coordinates: unknown` in SafeGeometry (4 definitions)
- `geometry: unknown` in feature handling
- `Record<string, unknown>` for feature properties throughout

#### High: Python `Any` in tool parameter models

```python
# services/calc/debrief_calc/models.py
class ParameterValue(BaseModel):
    value: Any = Field(...)  # JSON-serializable value — no type constraint
```

This means tool parameters have no type validation. A tool expecting a number will
accept a string without error from Pydantic.

#### High: STAC items are type-aliased to raw dicts in Python

```python
# services/stac/src/debrief_stac/types.py
STACItem: TypeAlias = dict[str, Any]
STACCatalog: TypeAlias = dict[str, Any]
```

Despite having STAC-related Pydantic models in the schema, the STAC service treats items
as untyped dictionaries. A STAC schema change won't surface type errors.

#### Medium: Feature properties never typed beyond `Record<string, unknown>`

Feature properties carry domain-specific fields (track name, color, sensor type, etc.)
that differ by feature kind. These are defined in Pydantic models on the Python side but
arrive in TypeScript as `Record<string, unknown>`. TypeScript code accesses properties
with string keys and no type safety:

```typescript
const name = feature.properties?.['name'];  // could be string, number, or missing
```

#### Medium: Session state schema exists but isn't enforced at runtime

LinkML defines `SessionState`, `TimeInstant`, `TimeRange`, `ViewportPolygon` etc., and
Pydantic models are generated — but the TypeScript Zustand store doesn't use these types.
State is stored as plain objects without schema validation.

#### Low: 49 `type: ignore` directives in Python test code

All in test files (primarily `test_stac_extension.py`). Acceptable for testing invalid
inputs, but 24 instances in one file suggests the test approach should use typed fixtures
instead of inline suppressions.

### Boundary strength summary

| Boundary | Python side | TypeScript side | Validated? | Drift risk |
|----------|-----------|----------------|------------|------------|
| Tool parameters | `ParameterValue(value: Any)` | `Record<string, unknown>` | No | **Critical** |
| Tool results | `ToolResult` (Pydantic) | `JSON.parse() as MCPToolResponse` | No | **Critical** |
| MCP annotations | `dict[str, Any]` | Specific interface shape | No | **Critical** |
| STAC items | `dict[str, Any]` alias | Raw objects | Structural only | **High** |
| GeoJSON features | Schema Pydantic models | `Record<string, unknown>` | Python-side only | **High** |
| Session state | Schema exists (unused) | Zustand (untyped) | No | **High** |
| Configuration | Pydantic models | VS Code API (no schema) | Independent | **Medium** |

### What to capture for resolution

For each weak typing instance, record:

- **File path and line number**
- **The weak pattern** (e.g., `JSON.parse() as Type`, `unknown`, `Any`, `dict[str, Any]`)
- **What type should be used instead** — reference the schema type name if one exists
- **Whether this is a boundary crossing** — data entering or leaving a language boundary
  is higher priority than internal weak typing
- **Validation approach needed**: one of:
  - **Generate and import** — type exists in LinkML; use generated TypeScript/Pydantic type
  - **Add runtime validation** — use Zod (TypeScript) or Pydantic (Python) to validate
    at parse boundary
  - **Narrow the type** — replace `unknown` with a type guard that checks the shape
  - **Add to schema** — concept isn't in LinkML yet; add it so both languages share the type
- **What breaks if this drifts** — describe the failure mode (silent data corruption,
  runtime crash, wrong UI rendering, etc.)

---

## 5. Inconsistent Service API Patterns

### What to look for

When services use different patterns for return types, error handling, and constructor
signatures, consumers must handle each service differently. This increases cognitive load
and makes it harder to write generic service infrastructure.

### How to detect

```bash
# Compare service class constructors
grep -n 'constructor(' apps/vscode/src/services/*.ts

# Compare return type patterns
grep -n 'Promise<' apps/vscode/src/services/*.ts | head -20

# Check error handling: does the service return error objects or throw?
grep -n 'success: false' apps/vscode/src/services/*.ts
grep -n 'throw new' apps/vscode/src/services/*.ts
```

### Known signals in this codebase

**CalcService vs StacService differ fundamentally:**

| Aspect | CalcService | StacService |
|--------|------------|-------------|
| Error reporting | Returns `{ success: false, error: string }` | Throws exceptions |
| Constructor deps | `(context, getMapPanel)` — takes UI dependency | Different signature |
| Return shape | `ToolExecutionResult` (union type) | Various `Promise<T>` types |

Consumers must use `if (result.success)` for CalcService but `try/catch` for StacService.

### What to capture for resolution

- **Service name** and **file path**
- **Constructor signature** (what dependencies it takes)
- **Return type pattern** (result objects vs thrown exceptions)
- **Error shape** (typed error objects, string messages, or raw exceptions)
- **Proposed common interface**: what a unified service contract would look like

---

## 6. State Management Fragmentation

### What to look for

When multiple state management approaches coexist without clear boundaries, it becomes
unclear where state should live. This leads to synchronisation bugs, prop drilling, and
conflicting update patterns.

### How to detect

```bash
# Count useState calls in app entry points (prop drilling indicator)
grep -c 'useState' apps/web-shell/src/App.tsx

# Check for Zustand store usage
grep -rn 'useSessionStore\|getSessionStore' apps/ shared/

# Check for React context usage
grep -rn 'useContext\|createContext' apps/ shared/ --include='*.ts' --include='*.tsx'

# Check subscription patterns
grep -rn 'subscribeToSlice\|subscribeToCurrentTime' apps/ shared/
```

### Known signals in this codebase

- `apps/web-shell/src/App.tsx` uses **16+ separate `useState()` calls** alongside
  the Zustand `useSessionStore()` hook
- Props are drilled 3+ levels deep (App → child → grandchild) for state that could
  live in the store
- The `session-state` package provides `subscribeToSlice()` utilities, but `App.tsx`
  doesn't use them — it uses the React hook instead
- `useContext` is not used anywhere; there's no intermediate context layer

### What to capture for resolution

- **File path** where mixed patterns occur
- **Which state lives in useState** vs **which lives in Zustand** — and whether the
  boundary is intentional or accidental
- **Prop drilling depth**: which props are passed through intermediaries that don't use them
- **Synchronisation risks**: places where local state and store state could diverge

---

## 7. Missing or Inconsistent Test Coverage

### What to look for

Services or components without tests, inconsistent coverage thresholds, and test
infrastructure that doesn't match the tools used in production.

### How to detect

```bash
# Find service directories without test subdirectories
for d in services/*/; do [ -d "$d/tests" ] || echo "NO TESTS: $d"; done

# Check coverage thresholds
grep -r 'fail_under' --include='pyproject.toml' .

# Find component source files without corresponding test files
# (compare src/ file count vs __tests__/ file count per package)
```

### Known signals in this codebase

| Area | Status |
|------|--------|
| `services/cli/` | **No test directory at all** |
| Coverage thresholds | 90% for stac/io, 80% for config/session-state-py, none for schemas |
| Component test ratio | 93% (67/72 components have tests) — good |
| E2E coverage | 9 Playwright specs — good |
| Schema round-trip tests | Exist but unclear if enforced in CI |

### What to capture for resolution

- **Package path** and whether tests exist
- **Current coverage percentage** (run `pytest --cov` or check CI output)
- **Coverage threshold** (if any) and whether it's appropriate
- **Types of tests missing**: unit, integration, E2E, schema validation
- **Risk of the untested code**: is it on the critical path or a peripheral utility?

---

## 8. Suppressed Warnings and Escape Hatches

### What to look for

`as any` casts, `@ts-expect-error`, `eslint-disable`, `type: ignore`, and `noqa`
directives. Each one is a point where the type system or linter was overridden. Some
are justified; unjustified ones are debt.

### How to detect

```bash
# TypeScript
grep -rn 'as any' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.d.ts'
grep -rn '@ts-expect-error\|@ts-ignore' --include='*.ts' --include='*.tsx' .
grep -rn 'eslint-disable' --include='*.ts' --include='*.tsx' .

# Python
grep -rn 'type: ignore' --include='*.py' .
grep -rn '# noqa' --include='*.py' .
```

### Current state (March 2026 audit)

| Directive | Count | Location | Assessment |
|-----------|-------|----------|------------|
| `as any` | 5 | Tests + E2E harness + App.tsx tool replay | All justified |
| `@ts-expect-error` | 4 | Storybook mocks, Leaflet workaround, test edge cases | All justified |
| `eslint-disable` | 12 | React prop-types (redundant with TS), hook deps, test patterns | Mostly justified |
| `type: ignore` (Python) | 49 | All in test code (schema extension tests) | Acceptable |
| `# noqa` | 13 | Generated/test code | Acceptable |
| Empty `catch {}` blocks | 52 | Graceful degradation paths | Justified but under-documented |

**Current state is good.** The risk is that these counts grow without justification as
more developers contribute. Each suppression should have an adjacent comment explaining why.

### What to capture for resolution

- **File path and line number** of each suppression
- **The specific rule being suppressed** (e.g., `no-explicit-any`, `[no-any-return]`)
- **Whether a justification comment exists** next to the suppression
- **Whether the suppression is still needed** (the underlying issue may have been fixed)
- **Classification**: justified (test fixture, library workaround) vs unjustified (laziness, time pressure)

---

## 9. TODO/FIXME/HACK Markers

### What to look for

Comments that indicate deferred work. Low counts are healthy; the risk is that they
accumulate without being tracked in the backlog.

### How to detect

```bash
grep -rn 'TODO\|FIXME\|HACK\|XXX' --include='*.ts' --include='*.tsx' --include='*.py' . \
  | grep -v node_modules | grep -v __pycache__
```

### Current state

Only **4 TODO comments** exist (excellent). All reference specific features or future
enhancements:

1. `apps/vscode/src/services/stacService.ts:953` — TODO(#137) temporal metadata delegation
2. `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` — "Create new store" button
3. `apps/loader/src/renderer/hooks/useLoadWorkflow.ts:73` — plot name resolution
4. `apps/loader/src/main/ipc/config.ts:158` — "Manage Stores" tab

### What to capture for resolution

- **File path and line number**
- **The full text of the comment**
- **Whether it references a GitHub issue** (e.g., `TODO(#137)`)
- **Whether it's blocking other work** or just a nice-to-have
- **Estimated effort** to resolve

---

## 10. Dead Code and Unused Exports

### What to look for

Functions, types, or modules that are defined but never imported elsewhere. These
accumulate when features are refactored or removed but their supporting code isn't
cleaned up.

### How to detect

```bash
# Find exports and check if they're imported anywhere
# (For TypeScript, tools like ts-prune or knip can automate this)
npx knip  # if installed

# Manual: check if a specific export is used
grep -rn 'import.*functionName' --include='*.ts' --include='*.tsx' .
```

### What to capture for resolution

- **File path** and **exported symbol name**
- **Whether it was ever imported** (git log can show if imports were removed)
- **Whether it's part of the public API** of a package (check `index.ts` re-exports)
- **Confidence level** that it's truly unused (some exports may be used by external
  consumers or loaded dynamically)

---

## 11. Logging Hygiene

### What to check

When `console.log`, `console.warn`, and `console.error` are mixed with a structured logger
(e.g., a named logger, `vscode.window.showErrorMessage`, or a Python `logging` call),
two problems arise: log output is unpredictable in different environments, and structured
log fields (timestamps, severity, request IDs) are lost for ad-hoc calls.

Look for:

- Raw `console.*` calls in production code (as opposed to test files)
- Python `print()` statements in service code that should use `logging`
- Inconsistent log levels for the same class of event (one path logs an error, an equivalent
  path silently swallows it)
- Missing log statements at important decision points (tool invocation, file I/O, MCP
  request handling)

### Why it matters

Inconsistent logging makes it hard to diagnose failures in production or demo environments.
In a thick-service architecture, Python services run as subprocesses and their stdout/stderr
is the primary observability mechanism. Unstructured output makes log aggregation and
filtering impractical.

### How to fix

1. Audit `console.*` usage across TypeScript source (excluding tests and Storybook stories):
   ```bash
   grep -rn 'console\.\(log\|warn\|error\|info\|debug\)' \
     --include='*.ts' --include='*.tsx' apps/ shared/ services/ \
     | grep -v node_modules | grep -v '\.test\.' | grep -v '\.stories\.'
   ```

2. Audit `print()` usage in Python service code (excluding tests):
   ```bash
   grep -rn '^\s*print(' --include='*.py' services/ \
     | grep -v __pycache__ | grep -v '/test'
   ```

3. For each hit, determine whether a structured alternative is appropriate:
   - TypeScript (VS Code extension): replace with `vscode.window.showErrorMessage` for
     user-facing messages, or a named logger exported from a shared `logger.ts` module
   - TypeScript (web-shell, components): replace with a logger that can be silenced in tests
   - Python services: replace `print()` with `import logging; logger = logging.getLogger(__name__)`

4. Establish a project convention in a `docs/logging-conventions.md` file so all contributors
   know which logger to use in each layer.

### What to capture for resolution

- **File path and line number** of each inconsistent logging call
- **Layer** (service, extension host, webview, test) — different conventions apply
- **Whether context is lost** (e.g., no request ID, no feature ID) that would be needed
  to trace a failure
- **Proposed replacement** and the logging convention it follows

---

## 12. Workspace Membership Drift

### What to check

In a monorepo with multiple workspace managers (`uv` for Python, `pnpm` for TypeScript),
it is possible for a package directory to exist on disk but not be registered in the
workspace manifest. Such packages are invisible to workspace-level commands (`uv run`,
`pnpm -r`) and their dependencies may not be installed or deduplicated correctly.

Look for:

- Directories under `services/` or `shared/` that contain a `pyproject.toml` but are not
  listed in the root `pyproject.toml` `[tool.uv.workspace]` members
- Directories under `apps/` or `shared/` that contain a `package.json` but are not matched
  by the root `pnpm-workspace.yaml` globs
- Packages listed in the workspace manifest that no longer exist on disk (stale entries)

### Why it matters

A package absent from the workspace will not be picked up by `pnpm -r test` or `uv run pytest`,
meaning its tests never run in CI. Its dependencies are installed independently rather than
being hoisted and deduplicated, which can reintroduce the version skew described in Section 1.

### How to fix

```bash
# Python: list workspace members declared vs directories that have pyproject.toml
grep -A50 '\[tool.uv.workspace\]' pyproject.toml | grep '"'
find . -name 'pyproject.toml' -not -path '*/node_modules/*' \
  -not -path '*/.venv/*' -not -name './pyproject.toml'

# TypeScript: check pnpm workspace globs
cat pnpm-workspace.yaml
find . -name 'package.json' -not -path '*/node_modules/*' \
  -not -name './package.json' | sort
```

Compare the two lists. Any directory with a manifest file that is not covered by the
workspace declaration should be added. Any workspace entry with no corresponding directory
should be removed.

### What to capture for resolution

- **Package path** and whether it is registered in `uv` workspace, `pnpm` workspace, or both
- **Whether it has tests** — an unregistered package with tests is a silent CI gap
- **Whether its dependencies appear in lockfiles** (`uv.lock`, `pnpm-lock.yaml`) — absence
  indicates it was never properly installed
- **Fix**: add the missing glob or explicit entry to the workspace manifest, then run
  `uv sync` / `pnpm install` to update lockfiles

---

## 13. Error Boundary Coverage

### What to check

React error boundaries prevent an unhandled exception in one component subtree from
crashing the entire application. Without them, a rendering error in a map overlay, chart
panel, or tool result display will take down the whole UI.

Look for:

- Top-level component trees (panel roots, view roots) that are not wrapped in an error boundary
- Error boundaries that exist but render no fallback UI (silent failure)
- Error boundaries that exist only in Storybook stories but not in production wrappers
- Async data-fetching hooks that reject without a boundary to catch the resulting render error

### Why it matters

In a thick-service architecture, services can fail independently. If the chart renderer
throws because a Vega-Lite spec has an unexpected shape, or if the map layer throws
because a GeoJSON feature is malformed, the error should be contained to that panel —
not propagate to kill the session view.

### How to fix

```bash
# Find existing error boundary implementations
grep -rn 'componentDidCatch\|ErrorBoundary' \
  --include='*.ts' --include='*.tsx' apps/ shared/ | grep -v node_modules

# Find panel / view root components (likely candidates for boundary placement)
find apps/ shared/ -name '*Panel*.tsx' -o -name '*View*.tsx' \
  -o -name '*Workspace*.tsx' | grep -v node_modules | grep -v '\.test\.'

# Check which roots are wrapped
grep -rn '<ErrorBoundary' --include='*.tsx' apps/ shared/ | grep -v node_modules
```

For each panel or view root identified, confirm it is either wrapped in an `<ErrorBoundary>`
or is itself an error boundary class component. Ensure the fallback renders a meaningful
message (component name, retry option) rather than `null`.

### What to capture for resolution

- **Component name and file path** of each panel/view root
- **Whether an error boundary wraps it** (yes / no / partial)
- **Fallback quality** — does the boundary render useful UI or silently hide the failure?
- **Proposed boundary placement** — wrapping at the panel level is usually the right
  granularity; wrapping every leaf component adds noise without benefit

---

## 14. Deprecated Code Tracking

### What to check

As APIs evolve, functions and types are deprecated in favour of replacements. Without
tracking, deprecated code accumulates until it becomes difficult to remove because too
many callers depend on it. This section covers both **internal deprecations** (within
this codebase) and **external deprecations** (upstream library APIs).

Look for:

- `@deprecated` JSDoc tags in TypeScript source
- Python `warnings.warn(..., DeprecationWarning)` calls in service code
- Imports of known-deprecated upstream APIs (e.g., VS Code API members marked deprecated
  in their type definitions)
- Old file format handlers or schema fields that have known replacements but haven't been
  removed yet

### Why it matters

Deprecated internal APIs that are never removed become permanent. Every new developer who
discovers them is uncertain whether to use them or the replacement. Deprecated upstream
APIs may be removed in future library versions, creating sudden breakage.

### How to fix

```bash
# Find internal deprecation markers
grep -rn '@deprecated\|DeprecationWarning\|warnings\.warn' \
  --include='*.ts' --include='*.tsx' --include='*.py' \
  apps/ shared/ services/ | grep -v node_modules | grep -v __pycache__

# Find VS Code API deprecated usage (check tsc output with --noEmitOnError off)
pnpm --filter @debrief/vscode exec tsc --noEmit 2>&1 | grep 'deprecated'

# Find deprecated imports from known libraries
grep -rn 'from.*@types/leaflet\|from.*leaflet' --include='*.ts' --include='*.tsx' \
  apps/ shared/ | grep -v node_modules
# Then cross-reference with the library's CHANGELOG for deprecated members
```

For each deprecated item found, record the replacement and set a removal milestone.
Internal deprecations should target removal within two feature cycles of the deprecation
being introduced.

### What to capture for resolution

- **Symbol name** and **file path** of the deprecated definition
- **All callers** — files that import or call the deprecated symbol
- **Replacement API** — what callers should use instead
- **Removal target** — which milestone or sprint the deprecated code should be deleted
- **Whether callers have been migrated** — if all callers already use the replacement,
  the deprecated definition can be deleted immediately

---

## 15. Cross-Layer Import Violations

### What to check

The architecture mandates that service code must never import from UI component libraries,
and that domain logic must not live in frontend layers. This is stricter than Section 3
(Cross-Layer Architectural Violations) — this section provides detection commands and
capture criteria specifically for enforcing the import boundary at the module level.

Violations occur when:

- A Python service imports any UI framework (`tkinter`, `PyQt`, browser-only packages)
- A TypeScript service module (under `apps/*/src/services/`) imports from `@debrief/components`
  or any React component package
- A file in `services/` imports from `apps/`
- A file in `shared/components/` imports from `apps/` (shared components must not depend
  on application-specific code)

### Why it matters

Services that import UI code cannot be tested without a rendering environment. They also
cannot be reused across frontends (VS Code and web-shell) without dragging in the UI
dependency. The "services never touch UI" principle exists precisely so that Python and
TypeScript services remain independently testable and frontend-agnostic.

### How to fix

```bash
# TypeScript service files importing UI packages
grep -rn "from '@debrief/components'\|from 'react'\|from 'react-leaflet'" \
  apps/vscode/src/services/ apps/web-shell/src/services/ \
  shared/utils/src/ | grep -v node_modules | grep -v '\.test\.'

# Python services importing anything UI-related
grep -rn '^import tkinter\|^from tkinter\|^import PyQt\|^import wx' \
  --include='*.py' services/ | grep -v __pycache__

# shared/components importing from apps/
grep -rn "from '.*apps/" --include='*.ts' --include='*.tsx' shared/components/ \
  | grep -v node_modules

# services/ importing from apps/
grep -rn "from '.*apps/" --include='*.ts' shared/ services/ | grep -v node_modules
```

For each violation, the fix is to extract the shared logic into a service or shared utility,
then have both the service and the UI layer import from the shared location. The service
must not take the UI type as a parameter — pass primitives or schema-defined types instead.

### What to capture for resolution

- **File path and line number** of the violating import
- **The imported symbol** and what it is used for
- **Direction** — service→UI, shared-component→app, or service→app
- **Proposed extraction point** — where the shared logic should move so neither side
  violates the boundary
- **Test impact** — can the service currently be tested in isolation? If not, resolving
  this violation is a prerequisite for meaningful unit tests

---

## Assessment Process

### Running a full audit

1. **Dependency skew** — Run the version comparison commands from Section 1. Cross-reference
   with `pnpm ls --depth=0` and `uv pip list` for resolved versions.

2. **Config drift** — Diff each category of config file. Start with tsconfig, then ESLint,
   then Python tooling.

3. **Architecture violations** — Run the cross-layer import checks from Section 3. Visualise
   with a dependency graph tool if the count exceeds 20.

4. **Type duplication** — Search for the known duplicated types from Section 4, then broaden
   the search to any `interface` or `type` name that appears in 2+ `types.ts` files.

5. **API consistency** — Review each service class's constructor, return types, and error
   handling. Document in a comparison table.

6. **State management** — Count `useState` calls in entry-point components. Map which state
   lives where.

7. **Test coverage** — Run `task test` with coverage flags. Compare thresholds.

8. **Suppressions** — Run the grep commands from Section 8. Review each for justification.

9. **TODOs** — Run the grep from Section 9. Ensure each is tracked in the backlog.

10. **Dead code** — Use `knip` or `ts-prune` for TypeScript. For Python, `vulture` can
    identify unused code.

11. **Logging hygiene** — Run the console/print grep commands from Section 11. Identify
    which calls belong in a structured logger and which (if any) are acceptable as-is.

12. **Workspace membership drift** — Compare workspace manifests against on-disk directories.
    Ensure every package with a `pyproject.toml` or `package.json` is registered.

13. **Error boundary coverage** — List all panel and view root components, then verify each
    is wrapped in an `<ErrorBoundary>`. Note missing or silent boundaries.

14. **Deprecated code** — Search for `@deprecated` and `DeprecationWarning`. For each,
    confirm a migration path exists and set a removal milestone.

15. **Cross-layer import violations** — Run the import-boundary checks from Section 15.
    Flag any service file that imports UI code or any shared-component that imports from apps.

### Recording findings

For each finding, create a record with:

```yaml
category: "dependency-skew | config-drift | architecture-violation | type-duplication | api-inconsistency | state-fragmentation | test-gap | suppression | todo | dead-code | logging-hygiene | workspace-drift | error-boundary | deprecated-code | cross-layer-import"
severity: "critical | high | medium | low"
file_paths:
  - path/to/file1.ts:42
  - path/to/file2.ts:17
description: "Brief description of the debt"
evidence: "Command output or code snippet demonstrating the issue"
proposed_fix: "What the resolution looks like"
effort_estimate: "S | M | L | XL"
blocked_by: "Any prerequisite work (e.g., 'needs shared base tsconfig first')"
```

### Prioritisation

Score each item on three dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Blast radius** | 40% | How many files/packages does this affect? |
| **Developer friction** | 35% | Does this cause confusion, bugs, or slow onboarding? |
| **Fix cost** | 25% | How much effort to resolve? (inverse — cheap fixes score higher) |

Tackle items that score high on blast radius and developer friction first, especially
if they're cheap to fix.
