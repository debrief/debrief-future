# Consolidate Config Handling Across Apps

## Problem

Configuration handling is duplicated across multiple applications instead of using the shared `shared/config-ts/` library. This violates the DRY principle and the project's "thick services, thin frontends" architecture.

Duplicated implementations:
- `apps/loader/src/main/ipc/config.ts` (198 lines) — custom config read/write
- VS Code extension — similar patterns for store management
- Both re-implement: config file paths, JSON read/write, store CRUD operations

Shared library exists but is unused:
- `shared/config-ts/src/` has full implementation:
  - `config.ts` — ConfigManager class
  - `storage.ts` — file storage abstraction
  - `paths.ts` — XDG-compliant path handling
  - `validation.ts` — Zod schemas
  - `types.ts` — TypeScript interfaces
  - Comprehensive test suite (5 test files)

This causes:
- Inconsistent behavior between apps
- Duplicated bug fixes needed across codebases
- Increased maintenance burden
- Drift from the Python `debrief-config` implementation

## Proposed Solution

Refactor apps to use `shared/config-ts`:

### Phase 1: Loader App
1. Add `@debrief/config` as dependency to `apps/loader/package.json`
2. Replace custom config functions with `ConfigManager` from shared lib
3. Update IPC handlers to delegate to shared implementation
4. Remove duplicated code (~150 lines)

### Phase 2: VS Code Extension
1. Add `@debrief/config` as dependency
2. Replace any custom config handling
3. Ensure consistent store management

### Migration Pattern
```typescript
// Before (apps/loader/src/main/ipc/config.ts)
async function readConfig(): Promise<DebriefConfig> {
  try {
    const data = await fs.readFile(getConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return { stores: [] };
  }
}

// After
import { ConfigManager } from '@debrief/config';
const config = new ConfigManager();
const stores = await config.getStores();
```

## Success Criteria

- [ ] Loader app imports and uses `shared/config-ts`
- [ ] VS Code extension imports and uses `shared/config-ts`
- [ ] Duplicated config code removed from both apps
- [ ] Config behavior consistent across all frontends
- [ ] All existing functionality preserved

## Constraints

- Must maintain backward compatibility with existing config files
- Electron main process context must be supported
- VS Code extension context must be supported
- Cannot break existing store registrations

## Out of Scope

- Adding new configuration options (separate items)
- Migrating Python services to use TypeScript config (they use debrief-config Python)
- Config schema changes
