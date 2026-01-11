# Research: debrief-config

**Date**: 2026-01-11
**Spec**: [spec.md](./spec.md)

This document captures research findings and technical decisions for the debrief-config service.

---

## Research Questions

1. XDG path resolution in Python
2. XDG path resolution in TypeScript
3. Concurrent file access handling
4. STAC catalog validation

---

## 1. Python XDG Paths: platformdirs

**Decision**: Use `platformdirs` library

**Rationale**:
- Well-maintained (latest 4.5.1, Dec 2025), MIT license
- Follows XDG Base Directory Specification
- Built-in `ensure_exists` parameter
- Returns pathlib.Path objects

**Alternatives Considered**:
- `appdirs` - abandoned, platformdirs is the official successor
- Manual implementation - unnecessary complexity

**Platform Paths** (for app name "debrief"):

| Platform | Config Path |
|----------|-------------|
| Linux | `~/.config/debrief` or `$XDG_CONFIG_HOME/debrief` |
| macOS | `~/Library/Application Support/debrief` |
| Windows | `%APPDATA%\debrief` |

**Implementation Pattern**:

```python
from platformdirs import user_config_path

def get_config_dir() -> Path:
    return user_config_path(appname="debrief", ensure_exists=True)

def get_config_file() -> Path:
    return get_config_dir() / "config.json"
```

---

## 2. TypeScript XDG Paths: env-paths

**Decision**: Use `env-paths` library with custom path alignment

**Rationale**:
- Most popular (~14.6M weekly downloads)
- Maintained by sindresorhus (reliable)
- Ships with TypeScript types
- ESM-only (aligns with modern TypeScript)

**Critical Finding**: Path mismatch between libraries!

| Platform | platformdirs (Python) | env-paths (TypeScript) |
|----------|----------------------|------------------------|
| Linux | `~/.config/debrief` | `~/.config/debrief` |
| macOS | `~/Library/Application Support/debrief` | `~/Library/Preferences/debrief` |
| Windows | `%APPDATA%\debrief` | `%APPDATA%\debrief\Config` |

**Resolution**: Override env-paths on macOS and Windows to match Python paths. This ensures both languages use the same config file.

**Implementation Pattern**:

```typescript
import envPaths from 'env-paths';
import { homedir } from 'node:os';
import { join } from 'node:path';

function getConfigDir(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    // Match platformdirs: ~/Library/Application Support/debrief
    return join(homedir(), 'Library', 'Application Support', 'debrief');
  }

  if (platform === 'win32') {
    // Match platformdirs: %APPDATA%\debrief (not \Config subfolder)
    return join(process.env.APPDATA || homedir(), 'debrief');
  }

  // Linux: env-paths matches platformdirs
  const paths = envPaths('debrief', { suffix: '' });
  return paths.config;
}
```

---

## 3. Concurrent File Access: Atomic Writes + Lockfile

**Decision**: Use atomic writes for corruption prevention + lockfile for concurrent write protection

**Rationale**:
- Single-user config, low write frequency → collision probability low
- But lost updates are confusing for users
- Atomic writes prevent corruption (partial JSON)
- Lockfile prevents lost updates when two processes write simultaneously

**Alternatives Considered**:
- **Single owner via MCP**: Cleanest but requires MCP infrastructure for every config read
- **OS-level file locking**: Not reliable cross-platform (NFS, Windows network shares)
- **No protection**: Simple but risks data loss

**Implementation Pattern**:

**Python**:
```python
from filelock import FileLock
import json
from pathlib import Path

def write_config(path: Path, data: dict) -> None:
    lock_path = path.with_suffix('.lock')
    with FileLock(lock_path, timeout=5):
        # Write to temp file, then atomic rename
        temp_path = path.with_suffix('.tmp')
        temp_path.write_text(json.dumps(data, indent=2))
        temp_path.replace(path)  # Atomic on POSIX

def read_config(path: Path) -> dict:
    # No lock needed - atomic writes ensure valid JSON
    if not path.exists():
        return {}
    return json.loads(path.read_text())
```

**TypeScript**:
```typescript
import lockfile from 'proper-lockfile';
import { writeFileSync, readFileSync, renameSync } from 'node:fs';

async function writeConfig(path: string, data: object): Promise<void> {
  const release = await lockfile.lock(path, {
    retries: { retries: 3, minTimeout: 100 },
    stale: 10000 // 10s stale lock detection
  });
  try {
    const tempPath = path + '.tmp';
    writeFileSync(tempPath, JSON.stringify(data, null, 2));
    renameSync(tempPath, path);
  } finally {
    await release();
  }
}

function readConfig(path: string): object {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}
```

**Dependencies**:
- Python: `filelock` (no additional deps for atomic write - use pathlib)
- TypeScript: `proper-lockfile` (uses mkdir strategy, most reliable cross-platform)

---

## 4. STAC Catalog Validation: Structural Check

**Decision**: Use fast structural check (no external dependencies)

**Rationale**:
- Constitution Article I requires offline operation
- pystac requires network for full validation
- stac-validator requires network for schema fetch
- Simple structural check is sufficient for registration

**What Makes a Valid STAC Catalog**:
1. Directory contains `catalog.json`
2. JSON has `type: "Catalog"`
3. JSON has required fields: `stac_version`, `id`, `description`, `links`

**Implementation Pattern**:

```python
import json
from pathlib import Path

class InvalidCatalogError(Exception):
    """Raised when path is not a valid STAC catalog."""
    pass

def validate_stac_catalog(path: Path) -> None:
    """Validate that path contains a valid STAC catalog.

    Raises:
        InvalidCatalogError: If validation fails
    """
    catalog_json = path / "catalog.json"

    if not catalog_json.exists():
        raise InvalidCatalogError(f"No catalog.json found at {path}")

    try:
        data = json.loads(catalog_json.read_text())
    except json.JSONDecodeError as e:
        raise InvalidCatalogError(f"Invalid JSON in catalog.json: {e}")

    # Check required fields per STAC spec
    required = {"type", "stac_version", "id", "description", "links"}
    missing = required - set(data.keys())
    if missing:
        raise InvalidCatalogError(f"Missing required fields: {missing}")

    if data.get("type") != "Catalog":
        raise InvalidCatalogError(f"Not a Catalog (type={data.get('type')})")

    if not isinstance(data.get("links"), list):
        raise InvalidCatalogError("links must be an array")
```

**Note**: This aligns with `debrief-stac` validation patterns (see `services/stac/tests/test_stac_validation.py`).

---

## Dependency Summary

**Python** (`services/config/pyproject.toml`):
```toml
dependencies = [
    "pydantic>=2.0.0",
    "platformdirs>=4.0.0",
    "filelock>=3.0.0",
]
```

**TypeScript** (`shared/config-ts/package.json`):
```json
{
  "dependencies": {
    "proper-lockfile": "^4.1.0",
    "zod": "^3.22.0"
  }
}
```

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Path mismatch between platformdirs and env-paths | Override TypeScript paths to match Python |
| Need for file locking | Yes - atomic writes + lockfile for concurrent protection |
| STAC validation approach | Structural check only (offline-compatible) |
| Schema approach | Defer LinkML; use Pydantic + Zod directly |

---

## References

- [platformdirs PyPI](https://pypi.org/project/platformdirs/)
- [env-paths npm](https://www.npmjs.com/package/env-paths)
- [filelock](https://pypi.org/project/filelock/)
- [proper-lockfile](https://www.npmjs.com/package/proper-lockfile)
- [STAC Catalog Specification](https://github.com/radiantearth/stac-spec/blob/master/catalog-spec/catalog-spec.md)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/)
