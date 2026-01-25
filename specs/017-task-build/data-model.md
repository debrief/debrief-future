# Data Model: Taskfile.yml Structure

**Feature**: 017-task-build
**Date**: 2026-01-23
**Purpose**: Define the structure and schema for Taskfile.yml

## Overview

The Taskfile.yml defines all build tasks for the debrief-future monorepo. It follows Task v3 syntax and orchestrates both Python (uv) and TypeScript (pnpm) toolchains.

## Taskfile Schema

```yaml
version: '3'

vars:
  # Global variables available to all tasks
  PYTHON_SOURCES: "services/**/*.py shared/**/*.py"
  TS_SOURCES: "apps/**/*.ts shared/**/*.ts"

tasks:
  # Each task follows this structure:
  task-name:
    desc: "Human-readable description"
    deps: [dependency-tasks]        # Run these first
    sources: [files-for-caching]    # Skip if unchanged
    generates: [output-files]       # Optional: output tracking
    preconditions:                  # Fail fast with message
      - sh: command
        msg: "Error message"
    cmds:
      - command1
      - command2
    interactive: true/false         # For watch processes
```

## Task Definitions

### install

**Purpose**: Install all Python and Node.js dependencies

```yaml
install:
  desc: "Install all dependencies"
  sources:
    - uv.lock
    - pnpm-lock.yaml
    - pyproject.toml
    - package.json
    - "**/pyproject.toml"
    - "**/package.json"
  preconditions:
    - sh: command -v uv
      msg: "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
    - sh: command -v pnpm
      msg: "pnpm not found. Install: npm install -g pnpm"
  cmds:
    - uv sync
    - pnpm install
```

### test

**Purpose**: Run all tests across Python and TypeScript

```yaml
test:
  desc: "Run all tests"
  deps: [install]
  cmds:
    - uv run pytest
    - pnpm test
```

### build

**Purpose**: Build all artifacts

```yaml
build:
  desc: "Build all artifacts"
  deps: [install]
  sources:
    - "{{.PYTHON_SOURCES}}"
    - "{{.TS_SOURCES}}"
  cmds:
    - pnpm build
```

### dev

**Purpose**: Start development watch mode

```yaml
dev:
  desc: "Start development watch mode"
  deps: [install]
  cmds:
    - pnpm dev
  interactive: true
```

### lint

**Purpose**: Check code style

```yaml
lint:
  desc: "Check code style"
  deps: [install]
  cmds:
    - uvx ruff check .
    - uvx ruff format --check .
    - pnpm lint
```

### lint:fix

**Purpose**: Auto-fix code style issues

```yaml
lint:fix:
  desc: "Auto-fix code style issues"
  deps: [install]
  cmds:
    - uvx ruff check --fix .
    - uvx ruff format .
    - pnpm lint:fix
```

### clean

**Purpose**: Remove build artifacts

```yaml
clean:
  desc: "Remove build artifacts"
  cmds:
    - rm -rf apps/loader/dist
    - rm -rf apps/loader/release
    - rm -rf apps/vscode/dist
    - rm -rf node_modules/.vite
    - rm -rf .pytest_cache
    - rm -rf **/__pycache__
```

## Task Dependency Graph

```
install
   │
   ├── test
   ├── build
   ├── dev
   ├── lint
   └── lint:fix

clean (standalone)
```

## Caching Strategy

| Task | Cache Sources | Effect |
|------|---------------|--------|
| install | Lockfiles (uv.lock, pnpm-lock.yaml) | Skip if deps unchanged |
| build | Source files (*.py, *.ts) | Skip if sources unchanged |
| test | None | Always runs (tests should always verify) |
| lint | None | Always runs (fast, checks current state) |

## Precondition Checks

| Check | Error Message |
|-------|---------------|
| `command -v uv` | "uv not found. Install: curl -LsSf https://astral.sh/uv/install.sh \| sh" |
| `command -v pnpm` | "pnpm not found. Install: npm install -g pnpm" |
| `command -v node` | "Node.js not found. Install from https://nodejs.org/" |
| `python3 --version` | "Python 3.11+ required" |
