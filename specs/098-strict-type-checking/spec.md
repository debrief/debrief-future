# Feature Specification: Strict Type Checking

**Feature Branch**: `098-strict-type-checking`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "We need to lock down our use of typed data — strict checking across Python and TypeScript domains. No relaxed types or use of 'any'. We need to concretely identify data types, and ensure adherence to it. We also need constitution-level guidance that we use strict type-safety."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Catches Type Errors at Build Time (Priority: P1)

A developer working on a Python service or TypeScript frontend writes code that uses an incorrect data type — for example, passing a string where a number is expected, or using an untyped dictionary where a typed model is required. The type checker catches this error before the code is committed, preventing it from reaching review or production.

**Why this priority**: This is the core value proposition. Catching type errors early reduces bugs in defence-grade software where failure is not an option. Without this, type mismatches propagate silently through the system.

**Independent Test**: Can be tested by introducing deliberate type errors into both Python and TypeScript code and verifying that the respective type checkers flag them as failures.

**Acceptance Scenarios**:

1. **Given** a Python file with a function that accepts `int` but is called with `str`, **When** the type checker runs, **Then** it reports a type error with file, line, and description.
2. **Given** a TypeScript file that assigns a value of the wrong type to a typed variable, **When** the TypeScript compiler runs in strict mode, **Then** it reports the error and the build fails.
3. **Given** a Python file that uses `Any` as a type annotation, **When** the type checker runs with strict rules, **Then** it flags the use of `Any` as a violation.
4. **Given** a TypeScript file that uses `any` as a type, **When** ESLint runs, **Then** it reports `no-explicit-any` as an error.

---

### User Story 2 - CI Pipeline Enforces Type Safety (Priority: P1)

A contributor submits a pull request. The CI pipeline runs type checking across all Python and TypeScript packages. If any type violations exist — including uses of `Any`/`any`, missing type annotations, or type mismatches — the pipeline fails and the PR cannot be merged.

**Why this priority**: Type safety must be enforced automatically, not rely on developer discipline alone. CI enforcement is the mechanism that guarantees the standard is maintained.

**Independent Test**: Can be tested by submitting a PR with known type violations and verifying CI blocks the merge.

**Acceptance Scenarios**:

1. **Given** a PR containing a Python file with `Any` type annotation, **When** CI runs, **Then** the type-check step fails and reports the violation.
2. **Given** a PR containing a TypeScript file with `as any` cast, **When** CI runs, **Then** the lint/type-check step fails and reports the violation.
3. **Given** a PR with all types correctly specified and no `Any`/`any` usage, **When** CI runs, **Then** the type-check step passes.

---

### User Story 3 - Constitution Encodes Type-Safety Principle (Priority: P1)

A new contributor or AI agent reads the constitution to understand development principles. They find an explicit article mandating strict type safety across all languages, prohibiting relaxed types, and requiring concrete data types for all function signatures, variables, and data structures.

**Why this priority**: Constitution-level guidance ensures type safety is a non-negotiable principle that persists across all contributors and sessions. Without it, the standard can erode over time.

**Independent Test**: Can be tested by reading the constitution and verifying the type-safety article exists with specific, unambiguous mandates.

**Acceptance Scenarios**:

1. **Given** the CONSTITUTION.md file, **When** a contributor reads it, **Then** they find an article specifically addressing strict type safety.
2. **Given** the type-safety article, **When** read, **Then** it mandates that `Any`/`any` are prohibited in production code.
3. **Given** the type-safety article, **When** read, **Then** it mandates that all function parameters, return types, and variables must have explicit type annotations.

---

### User Story 4 - Existing Codebase Brought Into Compliance (Priority: P2)

The existing codebase contains uses of `Any` in Python (approximately 143 occurrences across 30 files) and `any` in TypeScript (approximately 65 occurrences across 19 files). These are systematically identified, replaced with concrete types, and the codebase passes strict type checking with zero violations.

**Why this priority**: The new rules must apply to existing code, not just new code. A codebase with existing violations undermines the credibility and enforcement of the standard.

**Independent Test**: Can be tested by running the type checkers across the full codebase and verifying zero violations are reported.

**Acceptance Scenarios**:

1. **Given** the existing Python codebase, **When** the type checker runs in strict mode, **Then** zero `Any` usages are reported in production code.
2. **Given** the existing TypeScript codebase, **When** ESLint and the TypeScript compiler run, **Then** zero `any` usages are reported in production code.
3. **Given** test files that may require type flexibility for mocking, **When** reviewed, **Then** each use of `Any`/`any` is either replaced with a concrete type or documented with an explicit justification via a lint-disable comment referencing a specific reason.

---

### User Story 5 - Cross-Domain Type Consistency via Schema (Priority: P2)

A data structure defined in the LinkML schema is used in both a Python service and a TypeScript frontend. The generated types in both languages are strict — no optional fields are treated as required, no union types collapse to `Any`/`any`, and both sides enforce the same constraints.

**Why this priority**: Type safety within a single language is insufficient if the types diverge between Python and TypeScript. The schema-first approach must generate equally strict types in both languages.

**Independent Test**: Can be tested by generating types from the schema in both languages and verifying that field types, optionality, and constraints match.

**Acceptance Scenarios**:

1. **Given** a LinkML schema with a required string field, **When** types are generated, **Then** the Python model has `field: str` (not `field: Any`) and the TypeScript type has `field: string` (not `field: any`).
2. **Given** a LinkML schema with an optional field, **When** types are generated, **Then** both Python and TypeScript correctly represent it as optional with the concrete type (e.g., `Optional[str]` / `string | undefined`).
3. **Given** the existing schema generators, **When** they produce types with `Any`/`any`, **Then** the generator configuration is updated to produce concrete types instead.

---

### Edge Cases

- What happens when a third-party library returns `Any`/`any`? The consuming code must narrow the type immediately at the boundary, wrapping the external call in a typed function.
- What happens with JSON parsing, which inherently produces untyped data? Parsed JSON must be validated through a typed model (Pydantic in Python, schema-validated types in TypeScript) before use.
- What happens with catch blocks, which receive `unknown` (TypeScript) or `Exception` (Python)? These must use type narrowing — `instanceof` checks in TypeScript, specific exception types in Python — not `any`/`Any` casts.
- What happens with existing `eslint-disable` comments for `no-explicit-any`? Each must be reviewed: either replaced with a concrete type or re-justified with a specific technical reason.
- What happens with generic parameter dictionaries like `Record<string, unknown>` used to pass tool parameters? These must be replaced with references to existing concrete type declarations from the schema/type system. A generic dictionary is `any` by another name — it defers type checking to runtime and loses the compiler's ability to verify correctness at call sites. The fix is not per-tool bespoke interfaces, but expressing parameters in terms of the types that already exist in the project.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST have a static type checker configured for all Python packages, running in strict mode with `Any` disallowed in production code.
- **FR-002**: All TypeScript packages MUST have `strict: true` in their `tsconfig.json` and `@typescript-eslint/no-explicit-any` set to `"error"` (not `"off"` or `"warn"`).
- **FR-003**: All Python function signatures MUST have explicit type annotations for all parameters and return types.
- **FR-004**: All TypeScript function signatures MUST have explicit type annotations for all parameters and return types.
- **FR-005**: The CI pipeline MUST run type checking for both Python and TypeScript as a required check that blocks merge on failure.
- **FR-006**: The CONSTITUTION.md MUST include a new article mandating strict type safety across all languages used in the project.
- **FR-007**: All existing uses of `Any` in Python production code (approximately 143 occurrences) MUST be replaced with concrete types.
- **FR-008**: All existing uses of `any` in TypeScript production code (approximately 65 occurrences) MUST be replaced with concrete types.
- **FR-009**: Schema generators MUST produce fully-typed output — no `Any`/`any` in generated Python or TypeScript types.
- **FR-010**: Test files MAY use `Any`/`any` only when technically necessary for mocking, and each use MUST be accompanied by a lint-disable comment with a specific justification.
- **FR-011**: External library boundaries MUST be wrapped with typed functions that narrow `Any`/`any` returns to concrete types before use in application code.
- **FR-012**: JSON deserialization MUST pass through typed validation (Pydantic models in Python, schema-validated types in TypeScript) before data is used.
- **FR-013**: Generic parameter dictionaries (e.g., `Record<string, unknown>` for tool parameters) MUST be replaced with references to existing concrete type declarations from the project's type system. Passing data through untyped dictionaries defeats static analysis and is treated as equivalent to using `any`.

### Key Entities

- **Type Rule**: A constraint on type usage — language (Python/TypeScript), rule name, severity (error/warning), and scope (production/test).
- **Type Violation**: An instance where code fails type checking — file, line, violation type (missing annotation, use of `Any`/`any`, type mismatch), and resolution status.
- **Type Boundary**: A point where untyped data enters the system — external library call, JSON parse, user input — requiring type narrowing before further use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `Any` annotations exist in Python production code (non-test, non-generated files).
- **SC-002**: Zero `any` type annotations or casts exist in TypeScript production code (non-test files).
- **SC-003**: All Python packages pass strict static type checking with zero errors.
- **SC-004**: All TypeScript packages compile with `strict: true` and pass ESLint with `no-explicit-any: error` with zero violations.
- **SC-005**: CI pipeline includes type-checking steps for both languages, and these steps must pass for a PR to be merged.
- **SC-006**: CONSTITUTION.md contains a type-safety article that is referenced by the governance section and supersedes all other type-related guidance.
- **SC-007**: 100% of function signatures in production code have explicit type annotations in both Python and TypeScript.
- **SC-008**: Cross-language schema-generated types contain zero instances of `Any`/`any` — verified by automated checks on generated output.

## Assumptions

- **Python type checker**: The project will adopt a static type checker (such as mypy or pyright) since none is currently configured. The specific tool choice is an implementation decision.
- **Test file exceptions**: Test files are granted limited exceptions for `any`/`Any` usage when mocking requires it, but each exception must be individually justified.
- **Generated code**: Schema-generated code is treated as production code and must meet the same type-safety standards.
- **Incremental rollout**: While the specification targets zero violations, the implementation may need to proceed package-by-package given the ~208 existing violations across both languages.
- **ESLint config consistency**: All TypeScript packages will use a consistent ESLint configuration for type-checking rules, eliminating the current inconsistency where some packages use `recommended-requiring-type-checking` and others use only `recommended`.

## Dependencies

- **Schema generators**: LinkML generators for Python (gen-pydantic) and TypeScript (gen-typescript) must support strict type output. If they produce `Any`/`any`, generator configuration or post-processing must address this.
- **CI infrastructure**: The CI pipeline must support adding new check steps for Python type checking alongside existing TypeScript compilation and ESLint steps.
- **CONSTITUTION.md governance**: Adding a new article requires documented rationale and explicit approval per the constitution's governance section.
