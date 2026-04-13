# Quickstart: Platform Registry

## Prerequisites

- Python 3.11+, `uv` installed
- Node.js 18+, `pnpm` installed
- Repository cloned and dependencies installed (`uv sync && pnpm install`)

## Key Files

| File | Purpose |
|------|---------|
| `shared/data/platform-registry.json` | Registry data — vessel class tree with platform instances |
| `shared/data/src/debrief_data/registry.py` | Python loader — resolve, enumerate, traverse |
| `shared/data/src/ts/registry.ts` | TypeScript loader — same API surface |
| `shared/data/tests/fixtures/expected-platforms.json` | Golden fixture for cross-language parity tests |
| `shared/data/tests/test_registry.py` | Python unit tests |
| `shared/data/src/ts/__tests__/registry.test.ts` | TypeScript unit tests |

## Development

```bash
# Run Python tests
uv run pytest shared/data/tests/

# Run TypeScript tests
pnpm --filter @debrief/data test

# Type-check both
uv run pyright shared/data/
pnpm --filter @debrief/data typecheck
```

## Adding a New Platform

1. Edit `shared/data/platform-registry.json`
2. Add platform under the appropriate vessel class node:
   ```json
   "type23": {
     "_class": { "full_name": "Type 23 (Duke-class)" },
     "NELSON": { "name": "HMS Nelson", "short_name": "NLSN", "nationality": "GB" },
     "WESTMINSTER": { "name": "HMS Westminster", "short_name": "WMST", "nationality": "GB" }
   }
   ```
3. Update the golden fixture if adding to the parity test suite
4. No loader code changes required — the new platform is resolvable immediately

## Adding a New Vessel Class

1. Edit `shared/data/platform-registry.json`
2. Add a new interior node at the appropriate level:
   ```json
   "frigate": {
     "type23": {
       "_class": { "full_name": "Type 23 (Duke-class)" }
     },
     "type31": {
       "_class": { "full_name": "Type 31 (Inspiration-class)" }
     }
   }
   ```
3. No loader code changes required

## Usage Examples

### Python

```python
from debrief_data import load_registry

registry = load_registry()

# Resolve a single platform
nelson = registry.resolve("NELSON")
assert nelson is not None
assert nelson.name == "HMS Nelson"
assert nelson.vessel_class == "surface/warship/frigate/type23"

# Check if a platform is registered
if registry.resolve("UNKNOWN_SHIP") is None:
    print("Platform not in registry")

# List all platforms
for platform in registry.list_platforms():
    print(f"{platform.id}: {platform.name} ({platform.nationality})")

# Find all frigates
frigates = registry.find_by_class("surface/warship/frigate")
print(f"Found {len(frigates)} frigates")
```

### TypeScript

```typescript
import { loadRegistry } from '@debrief/data';

const registry = loadRegistry();

// Resolve a single platform
const nelson = registry.resolve('NELSON');
if (nelson) {
  console.log(nelson.name);          // "HMS Nelson"
  console.log(nelson.vessel_class);  // "surface/warship/frigate/type23"
}

// List all platforms
for (const platform of registry.listPlatforms()) {
  console.log(`${platform.id}: ${platform.name} (${platform.nationality})`);
}

// Find all surface vessels
const surfaceVessels = registry.findByClass('surface');
console.log(`Found ${surfaceVessels.length} surface vessels`);
```

## Testing

```bash
# Run all tests for this package
uv run pytest shared/data/tests/ -v
pnpm --filter @debrief/data test

# Run cross-language parity check
# Both test suites load the same golden fixture and assert identical results
uv run pytest shared/data/tests/test_registry.py -k "parity" -v
pnpm --filter @debrief/data test -- --grep "parity"
```
