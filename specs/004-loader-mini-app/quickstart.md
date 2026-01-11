# Quickstart: Loader Mini-App Development

**Feature**: 004-loader-mini-app
**Date**: 2026-01-11

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Electron runtime |
| pnpm | 8+ | Package management |
| Python | 3.11+ | Backend services |
| uv | latest | Python package management |

### Required Services

The Loader app depends on these services being installed:

```bash
# Install Python services via uv (from repo root)
uv pip install -e services/config
uv pip install -e services/io
uv pip install -e services/stac
```

### Verify Services

```bash
# Check services are accessible
debrief-config --version
debrief-io --version
debrief-stac --version
```

## Setup

### 1. Install Dependencies

```bash
cd apps/loader
pnpm install
```

### 2. Configure Development Environment

```bash
# Copy example environment
cp .env.example .env.local

# Edit .env.local if needed (defaults should work)
```

### 3. Start Development Server

```bash
# Start Electron in development mode
pnpm dev
```

This starts:
- Vite dev server for React hot reload
- Electron main process with auto-restart
- Storybook available at http://localhost:6006

## Project Structure

```
apps/loader/
├── src/
│   ├── main/           # Electron main process (Node.js)
│   ├── renderer/       # React app (browser context)
│   └── preload/        # Secure IPC bridge
├── tests/
│   ├── unit/           # Vitest tests
│   └── e2e/            # Playwright tests
├── stories/            # Storybook stories
└── package.json
```

## Common Tasks

### Run Tests

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:coverage

# E2E tests (requires built app)
pnpm test:e2e
```

### Run Storybook

```bash
# Start Storybook dev server
pnpm storybook

# Build static Storybook
pnpm build-storybook
```

### Build for Production

```bash
# Build distributable
pnpm build

# Build for specific platform
pnpm build:mac
pnpm build:win
pnpm build:linux
```

### Lint and Format

```bash
# Run ESLint
pnpm lint

# Run Prettier
pnpm format

# Type check
pnpm typecheck
```

## Testing with Sample Data

### Create a Test STAC Store

```bash
# Use debrief-stac CLI to create a test catalog
debrief-stac init ~/test-catalog --name "Test Store"
```

### Register the Store

```bash
# Use debrief-config to register the store
debrief-config add-store ~/test-catalog --name "Test Store"
```

### Get Sample REP File

Sample REP files are available in the test fixtures:

```bash
# Copy sample file to a convenient location
cp ../../services/io/tests/fixtures/sample-track.rep ~/sample-track.rep
```

### Launch Loader with File

```bash
# In development
pnpm dev -- ~/sample-track.rep

# Or double-click the file (after file associations are set up)
```

## Debugging

### Main Process

```bash
# Launch with Node inspector
pnpm dev:debug

# Then attach VS Code debugger (launch config provided)
```

### Renderer Process

Use Chrome DevTools (Ctrl+Shift+I / Cmd+Option+I in the Electron window).

### IPC Messages

Enable IPC logging:

```bash
# Set environment variable
DEBUG=loader:ipc pnpm dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | - | Debug namespaces (e.g., `loader:*`) |
| `LOADER_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `LOADER_PYTHON_PATH` | auto | Override Python executable path |

## Troubleshooting

### "Services not found"

Ensure Python services are installed and on PATH:

```bash
which debrief-io
which debrief-stac
```

If not found, activate the uv environment or install globally.

### "Cannot connect to service"

Check the service is working standalone:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | debrief-io
```

### "File association not working"

File associations require a built/installed app. In development:

```bash
# Pass file path as argument
pnpm dev -- /path/to/file.rep
```

## Next Steps

1. Review [data-model.md](./data-model.md) for TypeScript interfaces
2. Review [contracts/ipc-messages.md](./contracts/ipc-messages.md) for service integration
3. Check the Storybook for component documentation
4. Run `pnpm test` to verify setup
