# Usage Examples: debrief-config

This document demonstrates the debrief-config API in both Python and TypeScript.

## Python Usage

### Store Management

```python
from debrief_config import register_store, list_stores, remove_store

# Register a STAC catalog
store = register_store(
    path="/data/exercise-2024",
    name="Exercise 2024",
    notes="Main analysis catalog"
)
print(f"Registered: {store.name}")
# Output: Registered: Exercise 2024

# List all stores
stores = list_stores()
for s in stores:
    print(f"  - {s.name}: {s.path}")
# Output:
#   - Exercise 2024: /data/exercise-2024

# Remove store (keeps files)
remove_store("/data/exercise-2024")
print(f"Stores remaining: {len(list_stores())}")
# Output: Stores remaining: 0
```

### Preferences

```python
from debrief_config import get_preference, set_preference, delete_preference

# Set preferences
set_preference("theme", "dark")
set_preference("fontSize", 14)
set_preference("showGrid", True)

# Get preference with default
theme = get_preference("theme")
print(f"Theme: {theme}")
# Output: Theme: dark

missing = get_preference("unknown", default="fallback")
print(f"Missing: {missing}")
# Output: Missing: fallback

# Delete preference
delete_preference("theme")
print(f"Theme after delete: {get_preference('theme')}")
# Output: Theme after delete: None
```

### Path Utilities

```python
from debrief_config import get_config_dir, get_config_file

print(f"Config dir: {get_config_dir()}")
# Output (Linux): Config dir: /home/user/.config/debrief
# Output (macOS): Config dir: /Users/user/Library/Application Support/debrief

print(f"Config file: {get_config_file()}")
# Output (Linux): Config file: /home/user/.config/debrief/config.json
```

## TypeScript Usage

### Store Management

```typescript
import { registerStore, listStores, removeStore } from '@debrief/config';

// Register a STAC catalog
const store = await registerStore(
  '/data/exercise-2024',
  'Exercise 2024',
  'Main analysis catalog'
);
console.log(`Registered: ${store.name}`);
// Output: Registered: Exercise 2024

// List all stores (sync)
const stores = listStores();
for (const s of stores) {
  console.log(`  - ${s.name}: ${s.path}`);
}
// Output:
//   - Exercise 2024: /data/exercise-2024

// Remove store (keeps files)
await removeStore('/data/exercise-2024');
console.log(`Stores remaining: ${listStores().length}`);
// Output: Stores remaining: 0
```

### Preferences

```typescript
import { getPreference, setPreference, deletePreference } from '@debrief/config';

// Set preferences (async)
await setPreference('theme', 'dark');
await setPreference('fontSize', 14);
await setPreference('showGrid', true);

// Get preference with default (sync)
const theme = getPreference('theme');
console.log(`Theme: ${theme}`);
// Output: Theme: dark

const missing = getPreference('unknown', 'fallback');
console.log(`Missing: ${missing}`);
// Output: Missing: fallback

// Delete preference
await deletePreference('theme');
console.log(`Theme after delete: ${getPreference('theme')}`);
// Output: Theme after delete: undefined
```

### Path Utilities

```typescript
import { getConfigDir, getConfigFile } from '@debrief/config';

console.log(`Config dir: ${getConfigDir()}`);
// Output (Linux): Config dir: /home/user/.config/debrief
// Output (macOS): Config dir: /Users/user/Library/Application Support/debrief

console.log(`Config file: ${getConfigFile()}`);
// Output (Linux): Config file: /home/user/.config/debrief/config.json
```

## Error Handling

### Python

```python
from debrief_config import (
    register_store,
    InvalidCatalogError,
    StoreExistsError,
    StoreNotFoundError,
)

# Invalid catalog
try:
    register_store("/invalid/path", "Invalid")
except InvalidCatalogError as e:
    print(f"Invalid catalog: {e}")

# Duplicate registration
try:
    register_store("/data/catalog", "First")
    register_store("/data/catalog", "Second")
except StoreExistsError as e:
    print(f"Store exists: {e}")

# Remove nonexistent
try:
    remove_store("/nonexistent")
except StoreNotFoundError as e:
    print(f"Not found: {e}")
```

### TypeScript

```typescript
import {
  registerStore,
  InvalidCatalogError,
  StoreExistsError,
  StoreNotFoundError,
} from '@debrief/config';

// Invalid catalog
try {
  await registerStore('/invalid/path', 'Invalid');
} catch (e) {
  if (e instanceof InvalidCatalogError) {
    console.log(`Invalid catalog: ${e.message}`);
  }
}

// Duplicate registration
try {
  await registerStore('/data/catalog', 'First');
  await registerStore('/data/catalog', 'Second');
} catch (e) {
  if (e instanceof StoreExistsError) {
    console.log(`Store exists: ${e.message}`);
  }
}
```
