# Usage Example: Task Build Management

## Available Commands

```bash
$ task --list
task: Available tasks for this project:
* build:          Build all artifacts (Python wheels + TypeScript bundles)
* clean:          Remove build artifacts and caches
* default:        Show available tasks
* dev:            Start development watch mode
* install:        Install all dependencies (Python + Node.js)
* lint:           Check code style (Python + TypeScript)
* test:           Run all tests (Python + TypeScript)
* lint:fix:       Auto-fix code style issues
```

## Typical Workflow

### 1. Fresh Clone Setup

```bash
$ git clone https://github.com/debrief/debrief-future.git
$ cd debrief-future
$ task install
```

### 2. Run Tests (auto-installs if needed)

```bash
$ task test
task: Task "install" is up to date
task: [test] uv run pytest
...
task: [test] pnpm test
...
```

### 3. Build Artifacts

```bash
$ task build
task: Task "install" is up to date
task: [build] uv build --all
Successfully built dist/debrief_config-0.1.0-py3-none-any.whl
Successfully built dist/debrief_io-0.1.0-py3-none-any.whl
Successfully built dist/debrief_schemas-0.1.0-py3-none-any.whl
Successfully built dist/debrief_stac-0.1.0-py3-none-any.whl
task: [build] pnpm build
...
```

### 4. Start Development Mode

```bash
$ task dev
task: Task "install" is up to date
task: [dev] pnpm storybook
# Opens Storybook in browser at http://localhost:6006
```

### 5. Lint Code

```bash
$ task lint
task: Task "install" is up to date
task: [lint] uv run ruff check .
All checks passed!
task: [lint] pnpm lint
...
```

### 6. Auto-fix Style Issues

```bash
$ task lint:fix
task: [lint:fix] uv run ruff check --fix .
task: [lint:fix] uv run ruff format .
task: [lint:fix] pnpm lint -- --fix
```

### 7. Clean Build Artifacts

```bash
$ task clean
task: [clean] rm -rf dist/ .task/ .pytest_cache/ .ruff_cache/
task: [clean] rm -rf **/dist/ **/.pytest_cache/ **/__pycache__/
task: [clean] rm -rf node_modules/.cache/
```

## Caching Behavior

The install task uses checksum-based caching. When lockfiles haven't changed:

```bash
$ task install
task: Task "install" is up to date
```

No commands are executed, making subsequent runs near-instant.
