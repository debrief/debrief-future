# Fix Test Isolation in debrief-config Tests

## Problem

The `test_empty_list_when_no_stores` test in `services/config/tests/test_core.py` fails intermittently due to shared state between tests. When other tests register stores but don't clean up, subsequent test runs find unexpected stores.

Current state:
- `pyproject.toml:42` documents this with a TODO comment
- Tests use `register_store()` which persists state across tests
- No teardown fixtures clean up registered stores between tests
- Causes flaky CI builds and developer confusion

Root cause analysis:
- The `list_stores()` function returns stores from a shared configuration
- Tests like `test_register_valid_catalog` and `test_list_registered_stores` add stores
- The `test_empty_list_when_no_stores` test assumes a clean slate

## Proposed Solution

Add proper test isolation using pytest fixtures:

1. **Create a `clean_stores` fixture** that:
   - Saves existing store state before each test
   - Restores original state after each test (or clears all stores)

2. **Use `autouse=True`** to ensure all tests get isolated state

3. **Consider using `tmp_path` for config** — point config to a temporary directory per-test

Example fixture pattern:
```python
@pytest.fixture(autouse=True)
def clean_stores():
    """Ensure each test starts with clean store state."""
    # Could also redirect config path to tmp_path
    original_stores = list_stores()
    yield
    # Remove any stores added during test
    for store in list_stores():
        if store not in original_stores:
            remove_store(store.path)
```

## Success Criteria

- [ ] `test_empty_list_when_no_stores` passes consistently
- [ ] Tests can run in any order without failures
- [ ] TODO comment removed from `pyproject.toml`
- [ ] No shared state leaks between test classes

## Constraints

- Must work with existing pytest fixtures in `conftest.py`
- Should not require changes to production code
- Test isolation should be transparent to test authors

## Out of Scope

- Refactoring the config module's internal storage mechanism
- Adding additional test coverage (separate item)
