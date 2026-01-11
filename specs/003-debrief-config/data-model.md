# Data Model: debrief-config

**Date**: 2026-01-11
**Spec**: [spec.md](./spec.md)

This document defines the data model for the debrief-config service.

---

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Config                              │
├─────────────────────────────────────────────────────────────┤
│ version: string                                             │
│ stores: StoreRegistration[]                                 │
│ preferences: Record<string, PreferenceValue>                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    StoreRegistration                        │
├─────────────────────────────────────────────────────────────┤
│ path: string (unique key)                                   │
│ name: string                                                │
│ lastAccessed: ISO8601 datetime                              │
│ notes?: string                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Entities

### Config

Root configuration object stored in `config.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Schema version for forward compatibility (e.g., "1.0.0") |
| `stores` | StoreRegistration[] | Yes | List of registered STAC store locations |
| `preferences` | Record<string, PreferenceValue> | Yes | User preferences as key-value pairs |

**Validation Rules**:
- `version` must be a valid semver string
- `stores` must be an array (empty array if no stores registered)
- `preferences` must be an object (empty object if no preferences set)

**State Transitions**:
- Created with defaults on first access
- Reset to defaults if JSON is corrupted

---

### StoreRegistration

Entry for a known STAC catalog location.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Absolute path to STAC catalog directory |
| `name` | string | Yes | Human-readable display name |
| `lastAccessed` | string | Yes | ISO 8601 datetime of last access |
| `notes` | string | No | Optional user notes about the store |

**Validation Rules**:
- `path` must be a non-empty string (not validated as existing path at load time)
- `name` must be a non-empty string
- `lastAccessed` must be a valid ISO 8601 datetime string
- `path` must be unique within the stores array

**Invariants**:
- A store can only be registered once (path is the unique key)
- Registration does not imply the catalog still exists on disk

---

### PreferenceValue

Union type for preference values.

```typescript
type PreferenceValue = string | number | boolean | null;
```

**Supported preference keys** (extensible):

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultStore` | string | null | Path to default STAC store |
| `locale` | string | "en-GB" | User locale for formatting |
| `theme` | string | "system" | UI theme preference |

---

## JSON Schema

### config.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "stores", "preferences"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Schema version (semver)"
    },
    "stores": {
      "type": "array",
      "items": { "$ref": "#/$defs/StoreRegistration" },
      "description": "Registered STAC stores"
    },
    "preferences": {
      "type": "object",
      "additionalProperties": {
        "oneOf": [
          { "type": "string" },
          { "type": "number" },
          { "type": "boolean" },
          { "type": "null" }
        ]
      },
      "description": "User preferences"
    }
  },
  "$defs": {
    "StoreRegistration": {
      "type": "object",
      "required": ["path", "name", "lastAccessed"],
      "properties": {
        "path": {
          "type": "string",
          "minLength": 1,
          "description": "Absolute path to STAC catalog"
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "description": "Display name"
        },
        "lastAccessed": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 datetime"
        },
        "notes": {
          "type": "string",
          "description": "Optional user notes"
        }
      }
    }
  }
}
```

---

## Default Config

When config file is missing or corrupted, create with these defaults:

```json
{
  "version": "1.0.0",
  "stores": [],
  "preferences": {}
}
```

---

## Python Models (Pydantic)

```python
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field

class StoreRegistration(BaseModel):
    """A registered STAC catalog location."""
    path: str = Field(..., min_length=1, description="Absolute path to catalog")
    name: str = Field(..., min_length=1, description="Display name")
    last_accessed: datetime = Field(..., alias="lastAccessed")
    notes: str | None = Field(default=None)

    class Config:
        populate_by_name = True

PreferenceValue = str | int | float | bool | None

class Config(BaseModel):
    """Root configuration object."""
    version: str = Field(default="1.0.0", pattern=r"^\d+\.\d+\.\d+$")
    stores: list[StoreRegistration] = Field(default_factory=list)
    preferences: dict[str, PreferenceValue] = Field(default_factory=dict)
```

---

## TypeScript Types

```typescript
interface StoreRegistration {
  path: string;          // Absolute path to catalog
  name: string;          // Display name
  lastAccessed: string;  // ISO 8601 datetime
  notes?: string;        // Optional user notes
}

type PreferenceValue = string | number | boolean | null;

interface Config {
  version: string;                          // Schema version
  stores: StoreRegistration[];              // Registered stores
  preferences: Record<string, PreferenceValue>;  // User preferences
}
```

---

## Zod Schema (TypeScript)

```typescript
import { z } from 'zod';

const StoreRegistrationSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  lastAccessed: z.string().datetime(),
  notes: z.string().optional(),
});

const PreferenceValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const ConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  stores: z.array(StoreRegistrationSchema),
  preferences: z.record(PreferenceValueSchema),
});

export type StoreRegistration = z.infer<typeof StoreRegistrationSchema>;
export type Config = z.infer<typeof ConfigSchema>;
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Config file missing | Create with defaults |
| Config file corrupted (invalid JSON) | Log warning, reset to defaults |
| Config has unknown fields | Preserve (forward compatibility) |
| Store path contains special chars | Store as-is; validation only at registration time |
| Duplicate store path | Reject with error |
| Missing required fields | Reject with validation error (Pydantic/Zod) |

---

## Migration Strategy

For future schema changes:

1. Check `version` field on load
2. If version < current, run migration functions
3. Update version after migration
4. Write migrated config back to file

```python
MIGRATIONS = {
    "1.0.0": lambda config: config,  # No-op for current version
    # Future: "1.1.0": migrate_1_0_to_1_1,
}
```
