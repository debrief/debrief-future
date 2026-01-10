# Research: debrief-config

**Feature**: 003-debrief-config | **Date**: 2026-01-10

This document captures research decisions for the debrief-config implementation plan.

---

## 1. Python XDG Library

**Decision**: Use `platformdirs` library

**Rationale**:
- Cross-platform support (Linux, macOS, Windows) with correct paths:
  - Linux: `~/.config/debrief` (respects `XDG_CONFIG_HOME`)
  - macOS: `~/Library/Application Support/debrief`
  - Windows: `%APPDATA%\debrief`
- Zero runtime dependencies - aligns with Constitution Article IX
- ~47 million weekly downloads; classified as key ecosystem project
- Actively maintained under tox-dev/PyPA stewardship
- Built-in directory creation with `ensure_exists=True`
- Returns `pathlib.Path` objects with full type hints

**Alternatives Considered**:
| Option | Reason Rejected |
|--------|-----------------|
| appdirs | Officially deprecated; Python 3.12 compatibility issues |
| xdg-base-dirs | Linux-only; doesn't meet cross-platform requirement |
| Manual implementation | Reinvents the wheel; platformdirs has zero dependencies anyway |

**Usage Example**:
```python
from platformdirs import user_config_dir
from pathlib import Path

APP_NAME = "debrief"
config_dir = Path(user_config_dir(APP_NAME, appauthor=False, ensure_exists=True))
config_file = config_dir / "config.json"
```

**Dependencies**: Add `platformdirs>=4.0,<5` to pyproject.toml

---

## 2. TypeScript XDG Library

**Decision**: Manual path implementation (no external library)

**Rationale**:
- Critical path mismatch: `env-paths` uses `~/Library/Preferences` on macOS, but Python's `platformdirs` uses `~/Library/Application Support`
- Manual implementation provides exact parity with Python paths
- Zero dependencies - aligns with Constitution Article IX
- ~20 lines of straightforward code

**Alternatives Considered**:
| Library | macOS Path | Reason Rejected |
|---------|------------|-----------------|
| env-paths | `~/Library/Preferences` | Wrong directory for macOS |
| xdg-basedir | N/A | Linux only |
| platform-folders | `~/Library/Application Support` | Native addon, adds build complexity |

**Implementation**:
```typescript
// packages/config/src/paths.ts
import { homedir, platform } from 'os';
import { join } from 'path';

const APP_NAME = 'debrief';

export function getConfigDir(): string {
  switch (platform()) {
    case 'win32':
      return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), APP_NAME);
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', APP_NAME);
    default:
      const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
      return join(xdgConfig, APP_NAME);
  }
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}
```

---

## 3. TypeScript Test Framework

**Decision**: Use `Vitest` with `memfs` for filesystem mocking

**Rationale**:
- Already used in `@debrief/schemas` package - ensures workspace consistency
- Native TypeScript support - zero configuration needed
- Official filesystem mocking guidance with memfs
- 4x faster than Jest with 30% lower memory usage
- Built in 2021 with ESM/TypeScript in mind

**Alternatives Considered**:
| Framework | Reason Rejected |
|-----------|-----------------|
| Jest + ts-jest | Requires additional configuration for TypeScript/ESM |
| Node.js native | Less mature ecosystem for mocking |
| Mocha + Chai | Most configuration overhead |

**Configuration**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "memfs": "^4.14.0"
  }
}
```

---

## 4. Concurrent Access Handling

**Decision**: Atomic Write + Lock File Pattern

**Rationale**:
- Prevents corruption: atomic rename guarantees no partial writes
- Prevents race conditions: lock file coordinates across processes
- Cross-platform: `filelock` (Python) and `proper-lockfile` (Node.js) are battle-tested
- Recoverable: stale lock detection handles crashed processes
- Config stays human-readable (unlike SQLite)

**Alternatives Considered**:
| Approach | Reason Rejected |
|----------|-----------------|
| File locking only | No corruption safety |
| Atomic write only | No race condition protection (last writer wins) |
| SQLite | Loses human-editability of JSON config |
| Optimistic concurrency | TOCTOU risk; unreliable mtime resolution |
| Single-writer | Requires IPC if TypeScript needs to write |

**Algorithm**:
1. Acquire lock on `config.json.lock`
2. Read `config.json`
3. Modify in memory
4. Write to `config.json.tmp` (same directory for atomic rename)
5. Rename `config.json.tmp` → `config.json`
6. Release lock

**Dependencies**:
- Python: `filelock>=3.0` (MIT, pure Python, cross-platform)
- TypeScript: `proper-lockfile` (MIT, widely used)

---

## 5. Config Schema Approach

**Decision**: Pydantic-only (no LinkML)

**Rationale**:
- Config is internal application state, not domain data
- Existing services (`debrief-stac/models.py`, `debrief-io/models.py`) already use Pydantic directly for internal structures
- Simpler development: no generation pipeline for simple config
- Constitution Article II intent is domain data that crosses system boundaries

**Alternatives Considered**:
| Approach | Reason Rejected |
|----------|-----------------|
| LinkML | Overkill for internal state; adds generation step; existing precedent uses Pydantic |

**Precedent in Codebase**:
| Service | Internal Models | Approach |
|---------|-----------------|----------|
| debrief-stac | PlotMetadata, AssetProvenance | Pydantic only |
| debrief-io | ParseResult, ParseWarning | Pydantic only |
| debrief-schemas | Tracks, Features | LinkML (domain data) |

**Implementation**:
```python
from datetime import datetime
from pydantic import BaseModel, Field

class StoreRegistration(BaseModel):
    path: str = Field(..., description="Absolute path to STAC catalog")
    display_name: str = Field(..., description="Human-readable name")
    last_accessed: datetime | None = Field(default=None)
    notes: str | None = Field(default=None)

class Config(BaseModel):
    stores: list[StoreRegistration] = Field(default_factory=list)
    preferences: dict[str, str] = Field(default_factory=dict)
    version: str = Field(default="1.0")
```

---

## Summary

| Unknown | Decision | Dependencies |
|---------|----------|--------------|
| Python XDG library | platformdirs | `platformdirs>=4.0,<5` |
| TypeScript XDG library | Manual implementation | None |
| TypeScript test framework | Vitest + memfs | `vitest`, `memfs` |
| Concurrent access | Atomic write + lock file | `filelock`, `proper-lockfile` |
| Config schema | Pydantic-only | None (use existing Pydantic) |
