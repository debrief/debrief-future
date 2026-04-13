# Usage Example: Platform Registry

## Python

```python
from debrief_data import load_registry

# Load the bundled registry
registry = load_registry()

# Resolve a single platform by ID
nelson = registry.resolve("NELSON")
print(f"Name: {nelson.name}")          # HMS Nelson
print(f"Nationality: {nelson.nationality}")  # GB
print(f"Class: {nelson.vessel_class}")  # surface/warship/frigate/type23
print(f"Type: {nelson.vessel_type}")    # type23
print(f"Role: {nelson.vessel_role}")    # frigate
print(f"Domain: {nelson.domain}")       # surface

# Unknown platform returns None
unknown = registry.resolve("UNKNOWN")
print(f"Unknown: {unknown}")  # None

# List all registered platforms (sorted by ID)
for p in registry.list_platforms():
    print(f"  {p.id}: {p.name} ({p.nationality})")
# Output:
#   COLLINGWOOD: HMS Collingwood (GB)
#   FRIGATE: HMS Argyll (GB)
#   NELSON: HMS Nelson (GB)
#   OWNSHIP: HMS Defender (GB)
#   OWNSHIP_A: HMS Lancaster (GB)
#   OWNSHIP_B: USS Mason (US)
#   SENSOR: HMS Richmond (GB)
#   SUBJECT: Contact Alpha (GB)
#   TARGET: Contact Bravo (GB)
#   TMA_TRACK: TMA Solution Track (GB)

# Find platforms by vessel class path
frigates = registry.find_by_class("surface/warship/frigate")
print(f"Frigates: {[p.id for p in frigates]}")
# ['FRIGATE', 'NELSON', 'OWNSHIP_A', 'SENSOR']

# Validate a vessel class path
print(registry.is_valid_class("surface/warship/frigate"))  # True
print(registry.is_valid_class("nonexistent"))               # False
```

## TypeScript

```typescript
import { loadRegistry } from '@debrief/data';

// Load the bundled registry
const registry = loadRegistry();

// Resolve a single platform by ID
const nelson = registry.resolve('NELSON');
console.log(`Name: ${nelson?.name}`);          // HMS Nelson
console.log(`Nationality: ${nelson?.nationality}`);  // GB
console.log(`Class: ${nelson?.vessel_class}`);  // surface/warship/frigate/type23
console.log(`Type: ${nelson?.vessel_type}`);    // type23
console.log(`Role: ${nelson?.vessel_role}`);    // frigate
console.log(`Domain: ${nelson?.domain}`);       // surface

// Unknown platform returns undefined
const unknown = registry.resolve('UNKNOWN');
console.log(`Unknown: ${unknown}`);  // undefined

// List all registered platforms (sorted by ID)
for (const p of registry.listPlatforms()) {
  console.log(`  ${p.id}: ${p.name} (${p.nationality})`);
}

// Find platforms by vessel class path
const frigates = registry.findByClass('surface/warship/frigate');
console.log(`Frigates: ${frigates.map(p => p.id)}`);
// ['FRIGATE', 'NELSON', 'OWNSHIP_A', 'SENSOR']

// Validate a vessel class path
console.log(registry.isValidClass('surface/warship/frigate'));  // true
console.log(registry.isValidClass('nonexistent'));               // false
```

## Output Parity

Both Python and TypeScript loaders produce identical results:
- `resolve("NELSON")` returns the same 8 fields in both languages
- `list_platforms()` / `listPlatforms()` returns 10 platforms sorted by ID
- `find_by_class("surface")` / `findByClass("surface")` returns the same 7 surface platforms
- `is_valid_class()` / `isValidClass()` returns identical boolean results
