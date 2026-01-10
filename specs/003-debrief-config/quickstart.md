# Quickstart: debrief-config

**Feature**: 003-debrief-config | **Date**: 2026-01-10

This guide helps developers get started with the debrief-config library.

---

## Installation

### Python

```bash
# From workspace root
uv add debrief-config

# Or for development
cd services/config
uv sync
```

### TypeScript

```bash
# From workspace root
pnpm add @debrief/config

# Or from apps/loader
pnpm add @debrief/config
```

---

## Python Usage

### Register a STAC Store

```python
from debrief_config import register_store, list_stores, remove_store

# Register a new store
store = register_store(
    path="/home/user/projects/alpha-catalog",
    display_name="Alpha Project"
)
print(f"Registered: {store.display_name} at {store.path}")

# List all stores
stores = list_stores()
for s in stores:
    print(f"  {s.display_name}: {s.path}")

# Remove a store (catalog files unchanged)
remove_store("/home/user/projects/alpha-catalog")
```

### User Preferences

```python
from debrief_config import get_preference, set_preference

# Set user preferences
set_preference("default_store", "/home/user/projects/alpha-catalog")
set_preference("locale", "en-GB")

# Read preferences
locale = get_preference("locale", default="en-US")
print(f"Locale: {locale}")
```

### Get Config Paths

```python
from debrief_config import get_config_dir, get_config_path

config_dir = get_config_dir()   # ~/.config/debrief (Linux)
config_file = get_config_path() # ~/.config/debrief/config.json
```

### Error Handling

```python
from debrief_config import register_store, InvalidCatalogError, StoreNotFoundError

try:
    register_store("/invalid/path", "Bad Store")
except InvalidCatalogError as e:
    print(f"Cannot register: {e.reason}")

try:
    remove_store("/not/registered")
except StoreNotFoundError as e:
    print(f"Store not found: {e.path}")
```

---

## TypeScript Usage

### Register a STAC Store

```typescript
import { registerStore, listStores, removeStore } from '@debrief/config';

// Register a new store
const store = await registerStore(
  '/home/user/projects/alpha-catalog',
  'Alpha Project'
);
console.log(`Registered: ${store.display_name} at ${store.path}`);

// List all stores
const stores = await listStores();
stores.forEach(s => {
  console.log(`  ${s.display_name}: ${s.path}`);
});

// Remove a store (catalog files unchanged)
await removeStore('/home/user/projects/alpha-catalog');
```

### User Preferences

```typescript
import { getPreference, setPreference } from '@debrief/config';

// Set user preferences
await setPreference('default_store', '/home/user/projects/alpha-catalog');
await setPreference('locale', 'en-GB');

// Read preferences
const locale = await getPreference('locale') ?? 'en-US';
console.log(`Locale: ${locale}`);
```

### Get Config Paths

```typescript
import { getConfigDir, getConfigPath } from '@debrief/config';

const configDir = getConfigDir();   // ~/.config/debrief (Linux)
const configFile = getConfigPath(); // ~/.config/debrief/config.json
```

### Error Handling

```typescript
import { registerStore, InvalidCatalogError, StoreNotFoundError } from '@debrief/config';

try {
  await registerStore('/invalid/path', 'Bad Store');
} catch (e) {
  if (e instanceof InvalidCatalogError) {
    console.log(`Cannot register: ${e.reason}`);
  }
}

try {
  await removeStore('/not/registered');
} catch (e) {
  if (e instanceof StoreNotFoundError) {
    console.log(`Store not found: ${e.path}`);
  }
}
```

---

## Cross-Language Interoperability

The Python and TypeScript libraries share the same config file. Changes made from one language are immediately visible to the other.

```python
# Python: register a store
register_store("/shared/catalog", "Shared Data")
```

```typescript
// TypeScript: see the same store
const stores = await listStores();
// stores includes "Shared Data"
```

---

## Testing

### Python

```bash
cd services/config
uv run pytest
uv run pytest --cov  # with coverage
```

### TypeScript

```bash
cd packages/config
pnpm test
pnpm test:coverage
```

---

## Common Patterns

### Electron App: Load Config on Startup

```typescript
// apps/loader/src/main.ts
import { listStores, getPreference } from '@debrief/config';

async function initializeApp() {
  const stores = await listStores();
  const defaultStore = await getPreference('default_store');

  // Populate store selector dropdown
  populateStoreSelector(stores, defaultStore);
}
```

### Python Service: Auto-Register Catalog

```python
# After creating a new STAC catalog, register it
from debrief_config import register_store
from debrief_stac import create_catalog

catalog_path = create_catalog("/new/project", "My Analysis")
register_store(catalog_path, "My Analysis")
```

### Check Store Validity on List

```python
from debrief_config import list_stores

stores = list_stores()
for store in stores:
    if store.last_accessed is None:
        print(f"Warning: {store.display_name} catalog may be missing")
```

---

## File Locations Reference

| Platform | Config Directory |
|----------|-----------------|
| Linux | `~/.config/debrief/` or `$XDG_CONFIG_HOME/debrief/` |
| macOS | `~/Library/Application Support/debrief/` |
| Windows | `%APPDATA%\debrief\` |

**Files**:
- `config.json` - Main configuration file
- `config.json.lock` - Lock file for concurrent access

---

## Troubleshooting

### Config file corrupted

The library automatically recovers from corrupted config by resetting to defaults. A warning is logged and a backup is saved to `config.json.backup`.

### Lock file stuck

If a process crashes while holding the lock, the lock file may become stale. The library detects stale locks (>10 seconds old) and recovers automatically.

### Permission errors

Ensure the config directory is writable:
```bash
# Linux/macOS
chmod 755 ~/.config/debrief

# Windows: Check folder permissions in Properties
```
