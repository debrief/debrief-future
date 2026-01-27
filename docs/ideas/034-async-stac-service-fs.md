# Remove Synchronous fs Calls from VS Code stacService

## Problem

The VS Code extension's `StacService` class uses synchronous file system operations that block the extension host's event loop. This can cause UI freezes and poor responsiveness, especially with large STAC catalogs.

Problematic calls in `apps/vscode/src/services/stacService.ts`:

| Line | Sync Call | Usage |
|------|-----------|-------|
| 55 | `fs.existsSync()` | Check catalog exists |
| 62 | `fs.readFileSync()` | Read catalog.json |
| 385 | `fs.writeFileSync()` | Save track colors |
| 416 | `fs.existsSync()` | Check catalog path |
| 420 | `fs.readFileSync()` | Load catalog |
| 440 | `fs.existsSync()` | Check item path |
| 444 | `fs.readFileSync()` | Load item |
| 460 | `fs.existsSync()` | Check GeoJSON path |
| 464 | `fs.readFileSync()` | Load GeoJSON |
| 537 | `fs.existsSync()` | Check assets dir |
| 538 | `fs.mkdirSync()` | Create assets dir |
| 543 | `fs.copyFileSync()` | Copy source file |
| 555 | `fs.writeFileSync()` | Write item |
| 623 | `fs.writeFileSync()` | Write GeoJSON |
| 626 | `fs.writeFileSync()` | Write item |

Impact:
- Extension host thread blocked during file I/O
- VS Code UI may become unresponsive
- Degrades user experience with large files
- Violates VS Code extension best practices

## Proposed Solution

Replace all synchronous calls with async equivalents using `fs.promises`:

### Pattern 1: Existence Checks
```typescript
// Before
if (!fs.existsSync(catalogPath)) {
  return { valid: false, error: 'No catalog.json found' };
}

// After
import { promises as fsPromises } from 'fs';

try {
  await fsPromises.access(catalogPath);
} catch {
  return { valid: false, error: 'No catalog.json found' };
}
```

### Pattern 2: Read Operations
```typescript
// Before
const content = fs.readFileSync(catalogPath, 'utf-8');

// After
const content = await fsPromises.readFile(catalogPath, 'utf-8');
```

### Pattern 3: Write Operations
```typescript
// Before
fs.writeFileSync(fullPath, JSON.stringify(item, null, 2));

// After
await fsPromises.writeFile(fullPath, JSON.stringify(item, null, 2));
```

### Pattern 4: Directory Creation
```typescript
// Before
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// After
await fsPromises.mkdir(assetsDir, { recursive: true });
// mkdir with recursive:true doesn't throw if dir exists
```

### Implementation Notes
- Methods already return `Promise`, so callers don't change
- Some methods wrap sync code in `Promise.resolve()` — remove this pattern
- Cache operations remain unchanged (in-memory)

## Success Criteria

- [ ] No `fs.existsSync()` calls remain
- [ ] No `fs.readFileSync()` calls remain
- [ ] No `fs.writeFileSync()` calls remain
- [ ] No `fs.mkdirSync()` calls remain
- [ ] No `fs.copyFileSync()` calls remain
- [ ] All existing tests pass
- [ ] Extension remains responsive during file operations

## Constraints

- Must maintain identical behavior
- Error handling must be preserved
- Cache behavior unchanged
- Cannot change public API signatures (already async)

## Out of Scope

- Adding progress indicators for long operations
- Streaming large files
- Adding file watching capabilities
- Refactoring to use a different storage abstraction
