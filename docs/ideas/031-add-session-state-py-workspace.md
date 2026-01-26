# Add session-state-py Package to uv Workspace

## Problem

The `services/session-state-py/` package exists in the repository with a complete implementation but is not included in the uv workspace configuration. This means:

- `uv sync` does not install the package
- `uv build` does not build it
- Workspace-level commands skip this package entirely
- CI/CD pipelines may not properly validate this package

Current state:
- Package exists at `services/session-state-py/`
- Has `pyproject.toml`, `src/debrief_session/`, and `tests/`
- Implements Python client for the session state server
- Not listed in root `pyproject.toml` workspace members

Root `pyproject.toml` workspace members:
```toml
[tool.uv.workspace]
members = [
    "shared/schemas",
    "services/stac",
    "services/io",
    "services/config",
    "services/calc",
    "services/cli",
]
# Missing: "services/session-state-py"
```

## Proposed Solution

Add `services/session-state-py` to the workspace:

1. **Add to workspace members** in root `pyproject.toml`:
   ```toml
   [tool.uv.workspace]
   members = [
       "shared/schemas",
       "services/stac",
       "services/io",
       "services/config",
       "services/calc",
       "services/cli",
       "services/session-state-py",
   ]
   ```

2. **Add workspace source reference**:
   ```toml
   [tool.uv.sources]
   debrief-session = { workspace = true }
   ```

3. **Add test path** to pytest configuration if tests should run with workspace tests

4. **Verify** package installs and tests pass with `uv sync && uv run pytest`

## Success Criteria

- [ ] `services/session-state-py` listed in workspace members
- [ ] `uv sync` installs the package
- [ ] `uv run python -c "import debrief_session"` succeeds
- [ ] Package tests run with `uv run pytest services/session-state-py/tests`

## Constraints

- Package name must match existing `pyproject.toml` in `services/session-state-py/`
- May require dependency resolution if package has external dependencies
- Should maintain compatibility with existing workspace packages

## Out of Scope

- Adding new functionality to the session-state-py package
- Integrating session-state with other services (covered by backlog 024)
