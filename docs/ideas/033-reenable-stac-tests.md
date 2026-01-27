# Re-enable debrief-stac Tests in pytest

## Problem

The `debrief-stac` service tests are explicitly excluded from pytest runs, creating a test coverage gap for a core service.

Current state in `pyproject.toml:40`:
```toml
addopts = "--import-mode=importlib --ignore=services/stac/tests"
```

The stac service:
- Is a core component (item 001 in tracer bullet sequence)
- Handles all STAC catalog operations
- Has comprehensive tests (8 test files, ~75KB of test code)
- Tests are skipped without documented reason

This creates risk:
- Regressions in STAC operations go undetected
- Refactoring lacks safety net
- New contributors may not realize tests exist
- CI doesn't validate STAC functionality

## Proposed Solution

Re-enable the tests with necessary fixes:

### Step 1: Investigate Why Tests Were Disabled
- Run tests locally to identify failures
- Check git history for context on when/why excluded
- Document any environmental dependencies

### Step 2: Fix Any Broken Tests
Common issues to check:
- Missing test fixtures or conftest.py
- Import errors from workspace dependencies
- Filesystem path assumptions
- Missing test data files

### Step 3: Re-enable in pytest Config
```toml
# Remove --ignore flag
addopts = "--import-mode=importlib"
# Add stac tests to testpaths
testpaths = ["tests", "shared/schemas/tests", "services/io/tests", "services/config/tests", "services/stac/tests"]
```

### Step 4: Verify CI Passes
- Ensure all tests pass in CI environment
- Add any needed CI dependencies

## Success Criteria

- [ ] `--ignore=services/stac/tests` removed from pytest config
- [ ] `services/stac/tests` added to testpaths
- [ ] All stac tests pass locally
- [ ] All stac tests pass in CI
- [ ] Root cause of original exclusion documented

## Constraints

- Tests may have legitimate skip reasons (slow, require external resources)
- Should not break existing CI pipeline
- May require additional test dependencies

## Out of Scope

- Adding new test coverage for stac service (backlog item 028)
- Refactoring stac service implementation
- Performance optimization of tests
