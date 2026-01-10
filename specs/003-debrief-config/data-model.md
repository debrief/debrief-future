# Data Model: debrief-config

**Feature**: 003-debrief-config | **Date**: 2026-01-10

This document defines the data entities for the debrief-config service.

---

## Entities

### Config

Root configuration object containing store registrations and user preferences.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | string | Yes | "1.0" | Schema version for future migrations |
| `stores` | StoreRegistration[] | Yes | [] | List of registered STAC stores |
| `preferences` | Record<string, string> | Yes | {} | User preference key-value pairs |

**Validation Rules**:
- `version` must follow semver format (e.g., "1.0", "1.1")
- `stores` may be empty but must not be null
- `preferences` values are always strings (type coercion on set)

**JSON Example**:
```json
{
  "version": "1.0",
  "stores": [
    {
      "path": "/home/user/stac-catalogs/project-alpha",
      "display_name": "Project Alpha",
      "last_accessed": "2026-01-10T14:30:00Z",
      "notes": null
    }
  ],
  "preferences": {
    "default_store": "/home/user/stac-catalogs/project-alpha",
    "locale": "en-GB"
  }
}
```

---

### StoreRegistration

Entry for a known STAC store location.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | - | Absolute path to STAC catalog root |
| `display_name` | string | Yes | - | Human-readable name for UI display |
| `last_accessed` | datetime | No | null | ISO8601 timestamp of last access |
| `notes` | string | No | null | User notes about this store |

**Validation Rules**:
- `path` must be an absolute path (starts with `/` on Unix, drive letter on Windows)
- `path` must point to a valid STAC catalog (contains `catalog.json`)
- `display_name` must not be empty
- `display_name` should be unique within the stores list (warning, not error)
- `last_accessed` is updated on `list_stores()` call

**State Transitions**:
1. **Unregistered → Registered**: `register_store(path, name)` validates catalog, creates entry
2. **Registered → Updated**: `last_accessed` updated on access
3. **Registered → Unregistered**: `remove_store(path)` deletes entry (catalog files unchanged)

---

### Preferences

User preference key-value map. Reserved keys have specific semantics.

| Key | Type | Description |
|-----|------|-------------|
| `default_store` | string (path) | Path of default STAC store for new operations |
| `locale` | string (BCP-47) | User locale for formatting (e.g., "en-GB", "de-DE") |
| `theme` | string | UI theme preference (reserved for apps) |

**Extensibility**: Applications may store additional preferences using namespaced keys (e.g., `loader.last_directory`, `vscode.map_zoom`).

---

## Pydantic Models (Python)

```python
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field, field_validator

class StoreRegistration(BaseModel):
    """A registered STAC store location."""
    path: str = Field(..., description="Absolute path to STAC catalog root")
    display_name: str = Field(..., description="Human-readable name")
    last_accessed: datetime | None = Field(default=None)
    notes: str | None = Field(default=None)

    @field_validator('path')
    @classmethod
    def validate_absolute_path(cls, v: str) -> str:
        p = Path(v)
        if not p.is_absolute():
            raise ValueError("path must be absolute")
        return v

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("display_name must not be empty")
        return v.strip()


class Config(BaseModel):
    """Root configuration object."""
    version: str = Field(default="1.0", pattern=r"^\d+\.\d+$")
    stores: list[StoreRegistration] = Field(default_factory=list)
    preferences: dict[str, str] = Field(default_factory=dict)
```

---

## TypeScript Interfaces

```typescript
interface StoreRegistration {
  /** Absolute path to STAC catalog root */
  path: string;
  /** Human-readable name for UI display */
  display_name: string;
  /** ISO8601 timestamp of last access, or null */
  last_accessed: string | null;
  /** User notes about this store, or null */
  notes: string | null;
}

interface Config {
  /** Schema version for future migrations */
  version: string;
  /** List of registered STAC stores */
  stores: StoreRegistration[];
  /** User preference key-value pairs */
  preferences: Record<string, string>;
}
```

---

## Relationships

```
┌─────────────────────────────────────────┐
│                Config                    │
│  version: "1.0"                         │
├─────────────────────────────────────────┤
│  stores: [                              │
│    ┌─────────────────────────────────┐  │
│    │     StoreRegistration           │  │
│    │  path: "/path/to/catalog"       │  │
│    │  display_name: "My Project"     │──┼──► References STAC Catalog
│    │  last_accessed: "2026-01-10..." │  │     (external, validated)
│    └─────────────────────────────────┘  │
│  ]                                      │
├─────────────────────────────────────────┤
│  preferences: {                         │
│    "default_store": "/path/to/catalog"──┼──► References StoreRegistration.path
│    "locale": "en-GB"                    │
│  }                                      │
└─────────────────────────────────────────┘
```

---

## File Location

Config file path by platform:

| Platform | Path |
|----------|------|
| Linux | `~/.config/debrief/config.json` (or `$XDG_CONFIG_HOME/debrief/config.json`) |
| macOS | `~/Library/Application Support/debrief/config.json` |
| Windows | `%APPDATA%\debrief\config.json` |

Lock file: `config.json.lock` in same directory
