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
| `@sparticuz/chromium` | ^131.0.1 (root) vs ^143.0.4 (web-shell) | **Critical** — 12 major versions apart |
| `@playwright/test` | ^1.40.0 (components, loader) vs ^1.57.0 (root, web-shell) | **High** — API changes between versions |
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

**No shared base tsconfig exists.** Each package defines its own compiler options independently.

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

## 4. Type Duplication and Schema Drift

### What to look for

When the same type is defined independently in multiple places, changes to one definition
don't propagate. In a schema-first architecture, the generated types should be the single
source of truth, and no hand-written duplicates should exist.

### How to detect

```bash
# Find duplicate type names across packages
grep -rn 'interface MCPToolDefinition' --include='*.ts' .
grep -rn 'interface SafeFeature' --include='*.ts' .
grep -rn 'interface SafeGeometry' --include='*.ts' .
grep -rn 'interface ToolDefinition' --include='*.ts' .
grep -rn 'type DebriefFeature' --include='*.ts' .

# Check for hand-edited generated files (should have auto-generated headers)
head -5 shared/schemas/src/generated/typescript/types.ts
head -5 shared/schemas/src/generated/python/debrief_schemas/__init__.py

# Count types.ts files (potential duplication hotspots)
find . -name 'types.ts' -not -path '*/node_modules/*'
```

### Known signals in this codebase

**`MCPToolDefinition` defined in 3 places:**

1. `shared/components/src/ToolMatch/mcpAdapter.ts` (line 14)
2. `apps/vscode/src/types/tool.ts` (line 478)
3. `apps/web-shell/` (inline in mock service)

**`SafeFeature` / `SafeGeometry` / `SafeFeatureCollection` defined in 4 places:**

1. `apps/vscode/src/services/calcService.ts` (lines 71-78)
2. `apps/vscode/src/services/stacService.ts` (lines 46-56)
3. `apps/vscode/src/types/tool.ts` (lines 198-215)
4. `apps/web-shell/src/mocks/calcService.ts`

**Generated files lack auto-generated headers**, making it impossible to tell if they've
been hand-edited.

### What to capture for resolution

- **Type name** and every **file path + line number** where it's defined
- **Structural diff** between the definitions (are they identical, or have they diverged?)
- **Which definition is canonical** (generated schema, or a specific package)
- **Consumers**: which files import from each definition? This determines migration scope
- **Whether the type should be in `@debrief/schemas`** (generated from LinkML) or in a
  shared utility package

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

### Recording findings

For each finding, create a record with:

```yaml
category: "dependency-skew | config-drift | architecture-violation | type-duplication | api-inconsistency | state-fragmentation | test-gap | suppression | todo | dead-code"
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
