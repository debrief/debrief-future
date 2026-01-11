---
title: "Shipped: debrief-config - Cross-Language Configuration for Debrief v4"
date: 2026-01-11
tags: [debrief, config, python, typescript, stac]
---

# Shipped: debrief-config

We're pleased to announce the completion of **debrief-config**, a dual-language configuration service for Debrief v4.x. This component manages STAC store registrations and user preferences across both Python and TypeScript consumers.

## What We Built

debrief-config provides a unified configuration layer that:

- **Stores STAC catalog registrations** - Analysts can register local STAC catalogs that persist across application restarts
- **Manages user preferences** - Key-value storage for UI settings, defaults, and user customization
- **Works across languages** - Identical API in Python and TypeScript, reading/writing the same config file
- **Respects platform conventions** - XDG Base Directory on Linux, Application Support on macOS, AppData on Windows

## Technical Highlights

### Dual-Language Implementation

We implemented full API parity between Python and TypeScript:

**Python**:
```python
from debrief_config import register_store, list_stores, get_preference

store = register_store("/data/catalog", "My Catalog")
theme = get_preference("theme", default="system")
```

**TypeScript**:
```typescript
import { registerStore, listStores, getPreference } from '@debrief/config';

const store = await registerStore('/data/catalog', 'My Catalog');
const theme = getPreference('theme', 'system');
```

### Safe Concurrent Access

Both implementations use file locking and atomic writes to prevent corruption when multiple processes access the config simultaneously. This is essential for Debrief's multi-process architecture where Python services and Electron frontends may update config concurrently.

### STAC Validation

When registering a store, the system validates that the path contains a valid STAC catalog by checking for:
- Presence of `catalog.json`
- Correct `type` field (`Catalog` or `Collection`)
- Valid JSON structure with required STAC fields

This validation runs offline without network access, consistent with Debrief's offline-first design.

## Test Results

The implementation includes comprehensive test suites:

| Language | Tests | Status |
|----------|-------|--------|
| Python (pytest) | 43 | All passing |
| TypeScript (vitest) | 42 | All passing |
| **Total** | **85** | **All passing** |

Cross-language integration tests verify that stores registered from Python appear correctly in TypeScript and vice versa.

## What's Next

With the configuration layer complete, we can now build:

1. **Loader App** - Electron application for loading REP files into STAC catalogs
2. **VS Code Extension** - Maritime data visualization and analysis

The config service will provide the catalog selection dropdown and remember user preferences across both applications.

## Try It

```bash
# Python
cd services/config && uv sync
python -c "from debrief_config import get_config_dir; print(get_config_dir())"

# TypeScript
cd shared/config-ts && npm install
node -e "import('@debrief/config').then(c => console.log(c.getConfigDir()))"
```

---

*debrief-config is part of the Debrief v4.x rebuild. See the [repository](https://github.com/debrief/debrief-future) for more details.*
