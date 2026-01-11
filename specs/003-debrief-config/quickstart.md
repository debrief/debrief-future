# Quickstart: debrief-config

Get up and running with the debrief-config service in 5 minutes.

---

## Prerequisites

- Python 3.11+ with uv
- Node.js 20+ with pnpm (for TypeScript)
- A valid STAC catalog to register (or use debrief-stac to create one)

---

## Installation

### Python

```bash
# From repository root
cd services/config
uv sync

# Or install from workspace
uv add debrief-config
```

### TypeScript

```bash
# From repository root
cd shared/config-ts
pnpm install

# Or add to your project
pnpm add @debrief/config
```

---

## Quick Example

### Python

```python
from pathlib import Path
from debrief_config import register_store, list_stores, get_preference

# Register a STAC catalog
store = register_store(
    path=Path.home() / "data" / "exercise-2024",
    name="Exercise 2024"
)
print(f"Registered: {store.name} at {store.path}")

# List all stores
for s in list_stores():
    print(f"  - {s.name}")

# Check default store preference
default = get_preference("defaultStore")
if default:
    print(f"Default store: {default}")
```

### TypeScript

```typescript
import { registerStore, listStores, getPreference } from '@debrief/config';
import { homedir } from 'node:os';
import { join } from 'node:path';

async function main() {
  // Register a STAC catalog
  const store = await registerStore(
    join(homedir(), 'data', 'exercise-2024'),
    'Exercise 2024'
  );
  console.log(`Registered: ${store.name} at ${store.path}`);

  // List all stores
  const stores = await listStores();
  for (const s of stores) {
    console.log(`  - ${s.name}`);
  }

  // Check default store preference
  const defaultStore = await getPreference('defaultStore');
  if (defaultStore) {
    console.log(`Default store: ${defaultStore}`);
  }
}

main();
```

---

## Config File Location

The config file is stored in a platform-appropriate location:

| Platform | Path |
|----------|------|
| Linux | `~/.config/debrief/config.json` |
| macOS | `~/Library/Application Support/debrief/config.json` |
| Windows | `%APPDATA%\debrief\config.json` |

You can override the Linux path with `XDG_CONFIG_HOME`:

```bash
export XDG_CONFIG_HOME=/custom/config
# Config will be at /custom/config/debrief/config.json
```

---

## Common Tasks

### Register a Store

```python
# Python
from debrief_config import register_store

store = register_store("/path/to/catalog", "My Catalog")
```

```typescript
// TypeScript
const store = await registerStore('/path/to/catalog', 'My Catalog');
```

### Remove a Store

```python
# Python
from debrief_config import remove_store

remove_store("/path/to/catalog")  # Registration removed, files unchanged
```

```typescript
// TypeScript
await removeStore('/path/to/catalog');
```

### Set User Preferences

```python
# Python
from debrief_config import set_preference, get_preference

set_preference("theme", "dark")
set_preference("defaultStore", "/path/to/catalog")

theme = get_preference("theme", "system")  # Returns "dark"
```

```typescript
// TypeScript
await setPreference('theme', 'dark');
await setPreference('defaultStore', '/path/to/catalog');

const theme = await getPreference('theme', 'system');  // Returns "dark"
```

---

## Error Handling

```python
# Python
from debrief_config import (
    register_store,
    InvalidCatalogError,
    StoreExistsError,
    StoreNotFoundError,
)

try:
    register_store("/invalid/path", "Test")
except InvalidCatalogError as e:
    print(f"Not a valid STAC catalog: {e}")
except StoreExistsError:
    print("Store already registered")
```

```typescript
// TypeScript
import {
  registerStore,
  InvalidCatalogError,
  StoreExistsError,
} from '@debrief/config';

try {
  await registerStore('/invalid/path', 'Test');
} catch (e) {
  if (e instanceof InvalidCatalogError) {
    console.log(`Not a valid STAC catalog: ${e.message}`);
  } else if (e instanceof StoreExistsError) {
    console.log('Store already registered');
  }
}
```

---

## Cross-Language Interop

Both Python and TypeScript read/write the same config file. Changes made from one language are immediately visible to the other:

```bash
# Terminal 1 (Python)
python -c "from debrief_config import register_store; register_store('/data/test', 'Test')"

# Terminal 2 (Node.js) - sees the store immediately
node -e "import('@debrief/config').then(c => c.listStores()).then(console.log)"
```

---

## Running Tests

### Python

```bash
cd services/config
uv run pytest
```

### TypeScript

```bash
cd shared/config-ts
pnpm test
```

### Cross-Language Integration

```bash
# From repository root
./scripts/test-config-integration.sh
```

---

## Next Steps

- Read the [API documentation](./contracts/python-api.md) for full details
- See [data-model.md](./data-model.md) for the config schema
- Explore integration with [debrief-stac](../001-debrief-stac/) for creating catalogs
