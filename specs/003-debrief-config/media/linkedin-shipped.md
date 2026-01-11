# LinkedIn Post: debrief-config Shipped

---

**Shipped: Cross-language configuration for Debrief v4**

Just completed a key component of our Debrief maritime analysis platform rebuild: debrief-config.

**What it does:**
- Manages STAC catalog registrations across Python and TypeScript
- Provides unified user preferences storage
- Uses platform-correct config paths (XDG, Application Support, AppData)
- Supports safe concurrent access with file locking

**Why it matters:**
Debrief v4 uses Python for backend services and TypeScript for Electron/VS Code frontends. Both need to share the same configuration - which stores are registered, user preferences, etc.

With debrief-config, a catalog registered from Python is immediately visible in TypeScript, and vice versa. Same API, same config file, different languages.

**By the numbers:**
- 85 tests passing (43 Python, 42 TypeScript)
- Full API parity between languages
- Atomic writes prevent corruption

Next up: the Loader app that uses this config layer.

#opensource #python #typescript #maritime #gis #stac

---
