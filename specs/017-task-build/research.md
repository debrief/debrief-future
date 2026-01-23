# Research: Task Build Management

**Feature**: 017-task-build
**Date**: 2026-01-23
**Purpose**: Capture research findings and design decisions for Task adoption

## Research Questions

### Q1: Task caching mechanism for dependency installation

**Decision**: Use `sources:` directive with lockfiles for cache invalidation

**Rationale**: Task's caching system checks file checksums. When `sources:` files are unchanged, the task is skipped entirely (sub-second). This is ideal for `install` task using lockfiles.

**Implementation**:
```yaml
install:
  sources:
    - uv.lock
    - pnpm-lock.yaml
    - pyproject.toml
    - package.json
  cmds:
    - uv sync
    - pnpm install
```

**Alternatives considered**:
- `status:` command checks → Rejected: slower than checksum comparison
- No caching → Rejected: would add overhead to every dependent task

### Q2: Task dependency chain for automatic install

**Decision**: Use `deps:` directive to declare task dependencies

**Rationale**: Task runs all dependencies before the main task. Combined with caching, this ensures deps are installed with minimal overhead.

**Implementation**:
```yaml
test:
  deps: [install]
  cmds:
    - uv run pytest
    - pnpm test
```

**Alternatives considered**:
- Manual prerequisite checks in scripts → Rejected: duplicates Task's capability
- Separate install-check task → Rejected: adds unnecessary complexity

### Q3: Cross-platform compatibility

**Decision**: Use Task's built-in cross-platform support with `{{.OS}}` variable when needed

**Rationale**: Task provides variables for OS detection. Most commands (uv, pnpm) are already cross-platform.

**Implementation**:
```yaml
vars:
  PYTHON: '{{if eq .OS "windows"}}python{{else}}python3{{end}}'
```

**Alternatives considered**:
- Platform-specific Taskfiles → Rejected: duplicates configuration
- Shell detection scripts → Rejected: adds fragility

### Q4: Watch mode for development

**Decision**: Use pnpm's built-in watch capabilities via `task dev`

**Rationale**: pnpm workspace already supports watch mode. Task orchestrates the start but pnpm handles file watching.

**Implementation**:
```yaml
dev:
  deps: [install]
  cmds:
    - pnpm dev
  interactive: true
```

**Alternatives considered**:
- Task's `watch:` directive → Works but pnpm's watch is more mature for this use case
- Multiple watch processes → Rejected: harder to manage, Ctrl+C complexity

### Q5: CI integration approach

**Decision**: Install Task via official GitHub Action, use identical commands to local

**Rationale**: `arduino/setup-task@v2` is the official action. Using same commands ensures CI/local parity.

**Implementation**:
```yaml
# .github/workflows/ci.yml
- uses: arduino/setup-task@v2
  with:
    version: 3.x
- run: task test
```

**Alternatives considered**:
- Install Task via npm/pip → Rejected: unnecessary wrapper
- Separate CI scripts → Rejected: violates CI/local parity requirement

### Q6: Prerequisite checking for missing tools

**Decision**: Use `preconditions:` directive with clear error messages

**Rationale**: Task's preconditions fail fast with custom messages before running commands.

**Implementation**:
```yaml
install:
  preconditions:
    - sh: command -v uv
      msg: "uv not found. Install from https://docs.astral.sh/uv/"
    - sh: command -v pnpm
      msg: "pnpm not found. Install from https://pnpm.io/installation"
```

**Alternatives considered**:
- Let commands fail naturally → Rejected: poor error messages
- Pre-flight check task → Rejected: preconditions are cleaner

## Key Findings

1. **Task v3 syntax** is stable and recommended for new projects
2. **Checksum-based caching** on `sources:` is fast and reliable
3. **Preconditions** provide good DX for missing prerequisites
4. **GitHub Action** `arduino/setup-task@v2` is official and maintained
5. **Interactive mode** needed for watch processes to handle Ctrl+C properly

## Open Questions

None - all research questions resolved.
