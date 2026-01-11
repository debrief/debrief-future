# @debrief/config

Shared configuration service for Debrief v4.x (TypeScript). Manages STAC store registrations and user preferences, fully interoperable with the Python `debrief-config` library.

## Installation

```bash
cd shared/config-ts
pnpm install
```

## Quick Start

```typescript
import { registerStore, listStores, getPreference } from '@debrief/config';

// Register a STAC catalog
const store = await registerStore('/data/exercise-2024', 'Exercise 2024');

// List all stores
for (const s of listStores()) {
  console.log(`${s.name}: ${s.path}`);
}

// Get a preference
const theme = getPreference('theme', 'system');
```

## Features

- Cross-platform config paths (XDG on Linux, Application Support on macOS, AppData on Windows)
- STAC catalog validation on registration
- Atomic file writes with locking for concurrent access
- Full API parity with Python library (`debrief-config`)
- Both async and sync variants for read operations

## Config Location

| Platform | Path |
|----------|------|
| Linux | `~/.config/debrief/config.json` |
| macOS | `~/Library/Application Support/debrief/config.json` |
| Windows | `%APPDATA%\debrief\config.json` |

## API

### Store Management

```typescript
// Register a store (async)
await registerStore(path, name, notes?);

// List stores (sync)
const stores = listStores();

// Get specific store (sync)
const store = getStore(path);

// Remove store (async)
await removeStore(path);
```

### Preferences

```typescript
// Get preference (sync)
const value = getPreference(key, defaultValue?);

// Set preference (async)
await setPreference(key, value);

// Delete preference (async)
await deletePreference(key);
```

## Cross-Language Interop

Both Python and TypeScript libraries read and write the same `config.json` file. Changes made from one language are immediately visible to the other:

```bash
# Python writes
python -c "from debrief_config import set_preference; set_preference('theme', 'dark')"

# TypeScript reads
node -e "import('@debrief/config').then(c => console.log(c.getPreference('theme')))"
# Output: dark
```

## Development

```bash
# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## License

See repository root LICENSE file.
