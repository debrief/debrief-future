# TypeScript API Contract: debrief-config

**Package**: `@debrief/config`
**Version**: 0.1.0

This document defines the public API for the TypeScript debrief-config library.

---

## Module Exports

```typescript
import {
  getConfigDir,
  registerStore,
  listStores,
  removeStore,
  getPreference,
  setPreference,
  StoreRegistration,
  Config,
  InvalidCatalogError,
  StoreNotFoundError,
  StoreExistsError,
} from '@debrief/config';
```

---

## Functions

### `getConfigDir(): string`

Get the platform-specific configuration directory.

**Returns**: Path to config directory (creates if not exists)

**Platform Paths**:
- Linux: `~/.config/debrief` or `$XDG_CONFIG_HOME/debrief`
- macOS: `~/Library/Application Support/debrief`
- Windows: `%APPDATA%\debrief`

---

### `registerStore(path: string, name: string, notes?: string): Promise<StoreRegistration>`

Register a STAC catalog location.

**Parameters**:
- `path`: Absolute path to STAC catalog directory
- `name`: Human-readable display name
- `notes`: Optional notes about the store

**Returns**: Promise resolving to the created StoreRegistration

**Throws**:
- `InvalidCatalogError`: If path is not a valid STAC catalog
- `StoreExistsError`: If path is already registered
- `Error`: If path or name is empty

**Example**:
```typescript
import { registerStore } from '@debrief/config';

const store = await registerStore(
  '/data/exercise-2024',
  'Exercise 2024',
  'Main analysis catalog'
);
console.log(`Registered: ${store.name}`);
```

---

### `listStores(): Promise<StoreRegistration[]>`

List all registered STAC stores.

**Returns**: Promise resolving to array of StoreRegistration objects

**Example**:
```typescript
import { listStores } from '@debrief/config';

const stores = await listStores();
for (const store of stores) {
  console.log(`${store.name}: ${store.path}`);
}
```

---

### `removeStore(path: string): Promise<void>`

Remove a store registration (does not delete the catalog).

**Parameters**:
- `path`: Path of the store to remove

**Throws**:
- `StoreNotFoundError`: If path is not registered

**Example**:
```typescript
import { removeStore } from '@debrief/config';

await removeStore('/data/old-catalog');
```

---

### `getPreference<T>(key: string, defaultValue?: T): Promise<T | PreferenceValue>`

Get a user preference value.

**Parameters**:
- `key`: Preference key
- `defaultValue`: Value to return if key not found

**Returns**: Promise resolving to preference value or default

**Example**:
```typescript
import { getPreference } from '@debrief/config';

const theme = await getPreference('theme', 'system');
```

---

### `setPreference(key: string, value: PreferenceValue): Promise<void>`

Set a user preference value.

**Parameters**:
- `key`: Preference key
- `value`: Value to store (string, number, boolean, or null)

**Example**:
```typescript
import { setPreference } from '@debrief/config';

await setPreference('theme', 'dark');
await setPreference('defaultStore', '/data/main-catalog');
```

---

## Interfaces

### `StoreRegistration`

```typescript
interface StoreRegistration {
  /** Absolute path to STAC catalog */
  path: string;
  /** Human-readable display name */
  name: string;
  /** ISO 8601 datetime of last access */
  lastAccessed: string;
  /** Optional user notes */
  notes?: string;
}
```

---

### `Config`

```typescript
interface Config {
  /** Schema version (semver) */
  version: string;
  /** Registered STAC stores */
  stores: StoreRegistration[];
  /** User preferences */
  preferences: Record<string, PreferenceValue>;
}
```

---

## Types

### `PreferenceValue`

```typescript
type PreferenceValue = string | number | boolean | null;
```

---

## Error Classes

### `InvalidCatalogError`

Thrown when a path is not a valid STAC catalog.

```typescript
class InvalidCatalogError extends Error {
  constructor(message: string);
}
```

---

### `StoreNotFoundError`

Thrown when attempting to access an unregistered store.

```typescript
class StoreNotFoundError extends Error {
  constructor(path: string);
}
```

---

### `StoreExistsError`

Thrown when attempting to register a store that already exists.

```typescript
class StoreExistsError extends Error {
  constructor(path: string);
}
```

---

## Synchronous Variants

For use in contexts where async is inconvenient (e.g., app initialization):

```typescript
import {
  getConfigDirSync,
  listStoresSync,
  getPreferenceSync,
} from '@debrief/config';

// Read-only sync operations
const configDir = getConfigDirSync();
const stores = listStoresSync();
const theme = getPreferenceSync('theme', 'system');
```

**Note**: Write operations (`registerStore`, `removeStore`, `setPreference`) are async-only due to file locking requirements.

---

## Usage Example

```typescript
import {
  registerStore,
  listStores,
  removeStore,
  getPreference,
  setPreference,
} from '@debrief/config';

async function main() {
  // Register a new store
  const store = await registerStore(
    '/data/exercise-2024',
    'Exercise 2024'
  );
  console.log(`Registered: ${store.name}`);

  // List all stores
  const stores = await listStores();
  for (const s of stores) {
    console.log(`  - ${s.name}: ${s.path}`);
  }

  // Set default store
  await setPreference('defaultStore', store.path);

  // Get default store
  const defaultStore = await getPreference('defaultStore');
  console.log(`Default store: ${defaultStore}`);

  // Remove a store (keeps files, just removes registration)
  await removeStore(store.path);
}

main().catch(console.error);
```

---

## API Parity with Python

| Python | TypeScript | Notes |
|--------|------------|-------|
| `get_config_dir()` | `getConfigDir()` | Sync in both |
| `register_store()` | `registerStore()` | Async in TS |
| `list_stores()` | `listStores()` | Sync + async variants in TS |
| `remove_store()` | `removeStore()` | Async in TS |
| `get_preference()` | `getPreference()` | Sync + async variants in TS |
| `set_preference()` | `setPreference()` | Async in TS |

Both libraries read/write the same `config.json` file format.
