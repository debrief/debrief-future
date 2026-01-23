# Quickstart: Task Build System

**Feature**: 017-task-build
**Date**: 2026-01-23
**Audience**: Developers new to the debrief-future repository

## Prerequisites

Before using the build system, install these tools:

| Tool | Version | Installation |
|------|---------|--------------|
| Task | 3.x | https://taskfile.dev/installation/ |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| pnpm | 8.x+ | `npm install -g pnpm` |
| Node.js | 18+ | https://nodejs.org/ |
| Python | 3.11+ | https://www.python.org/ |

## First-Time Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/debrief/debrief-future.git
cd debrief-future
task install
```

The `install` task handles both Python (uv) and Node.js (pnpm) dependencies.

## Common Commands

| Command | Description |
|---------|-------------|
| `task install` | Install all dependencies |
| `task test` | Run all tests (Python + TypeScript) |
| `task build` | Build all artifacts |
| `task dev` | Start development watch mode |
| `task lint` | Check code style |
| `task lint:fix` | Auto-fix style issues |
| `task clean` | Remove build artifacts |
| `task --list` | Show all available tasks |

## Automatic Dependency Installation

All major commands (`test`, `build`, `dev`, `lint`) automatically run `install` first if needed. You don't need to remember to run `install` separately.

```bash
# These work on a fresh checkout:
task test      # Installs deps, then runs tests
task build     # Installs deps, then builds
task dev       # Installs deps, then starts watch mode
```

## Caching

The build system caches results to speed up repeated runs:

- **Dependencies**: Cached based on lockfiles. If `uv.lock` and `pnpm-lock.yaml` are unchanged, `install` skips entirely.
- **Builds**: Cached based on source files. Unchanged sources = instant build.

Typical performance:
- Fresh install: ~30-60 seconds
- Cached install: < 1 second
- Fresh test run: ~60-120 seconds
- Cached build: < 5 seconds

## Troubleshooting

### "task: command not found"

Install Task from https://taskfile.dev/installation/

On macOS with Homebrew:
```bash
brew install go-task
```

### "uv not found"

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### "pnpm not found"

```bash
npm install -g pnpm
```

### Tests fail with import errors

Dependencies may be out of date. Run:
```bash
task install
```

### Cache seems stale

Force a clean rebuild:
```bash
task clean
task build
```

## CI Usage

The CI pipeline uses the same commands as local development:

```yaml
# .github/workflows/ci.yml
- uses: arduino/setup-task@v2
- run: task test
```

This ensures CI and local development behave identically.
