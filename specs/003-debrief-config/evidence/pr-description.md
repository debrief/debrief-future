# Pull Request: feat(debrief-config): Add dual-language configuration service

## Summary

- Implements shared configuration service for Debrief v4.x in Python and TypeScript
- Manages STAC store registrations with validation and user preferences
- Uses platform-appropriate XDG paths (Linux, macOS, Windows)
- Full API parity between languages with atomic writes and file locking

## Changes

### Phase 1: Project Setup
- Created Python package at `services/config/`
- Created TypeScript package at `shared/config-ts/`
- Configured dependencies and build tools

### Phase 2: Foundation
- Pydantic models (Config, StoreRegistration) with camelCase JSON aliases
- Zod schemas for TypeScript runtime validation
- Custom exception classes for both languages

### Phase 3: Cross-Platform Paths (US4)
- platformdirs integration for Python
- Custom TypeScript paths matching Python behavior
- XDG_CONFIG_HOME override support

### Phase 4: Store Registration (US1/US2)
- `register_store()` with STAC catalog validation
- `list_stores()` returning all registered stores
- Atomic writes with file locking for concurrent access

### Phase 5: TypeScript Implementation (US5)
- Full API parity with Python implementation
- Cross-language config file compatibility
- Sync/async variants for read operations

### Phase 6: Store Removal (US3)
- `remove_store()` for unregistering stores
- Files preserved (only registration removed)

### Phase 7: User Preferences (US6)
- `get_preference()` / `set_preference()` / `delete_preference()`
- Support for string, number, boolean, and null values

## Evidence

### Test Results

| Language | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Python (pytest) | 43 | 43 | 0 |
| TypeScript (vitest) | 42 | 42 | 0 |
| **Total** | **85** | **85** | **0** |

**Key scenarios verified:**
- Store registration with STAC validation
- Cross-language config file compatibility
- Platform-specific path resolution
- Concurrent access with file locking
- Preference persistence

### Usage Example

**Python:**
```python
from debrief_config import register_store, list_stores, get_preference

store = register_store("/data/exercise-2024", "Exercise 2024")
theme = get_preference("theme", default="system")
```

**TypeScript:**
```typescript
import { registerStore, listStores, getPreference } from '@debrief/config';

const store = await registerStore('/data/exercise-2024', 'Exercise 2024');
const theme = getPreference('theme', 'system');
```

### Cross-Language Interoperability

Both languages read/write the same `config.json`:
```json
{
  "version": "1.0.0",
  "stores": [
    {
      "path": "/data/exercise-2024",
      "name": "Exercise 2024",
      "lastAccessed": "2026-01-11T10:30:00.000Z",
      "notes": "Main analysis catalog"
    }
  ],
  "preferences": {
    "theme": "dark",
    "fontSize": 14
  }
}
```

## Test Plan

- [x] Store registration validates STAC catalogs
- [x] Stores persist across application restarts
- [x] Python-written config readable from TypeScript
- [x] TypeScript-written config readable from Python
- [x] Platform paths correct on Linux (XDG)
- [x] Preferences survive config reloads
- [x] Concurrent access handled via file locking
- [x] Corrupted config gracefully reset to defaults

## Related

- Spec: `specs/003-debrief-config/spec.md`
- Tasks: `specs/003-debrief-config/tasks.md`
- Plan: `specs/003-debrief-config/plan.md`
