# Research: Loader Mini-App

**Feature**: 004-loader-mini-app
**Date**: 2026-01-11
**Purpose**: Resolve technical unknowns before implementation

## Research Topics

### 1. Electron + Python Service Integration

**Question**: How should the Electron app communicate with Python services (debrief-io, debrief-stac)?

**Decision**: Use child process spawning with JSON-RPC over stdio

**Rationale**:
- debrief-config already has a TypeScript implementation (per Stage 3), so no IPC needed for config
- For Python services, spawn child processes and communicate via JSON-RPC over stdin/stdout
- This approach is:
  - Offline-friendly (no network stack needed)
  - Cross-platform (works on Linux, macOS, Windows)
  - Simple to implement and debug
  - Consistent with MCP's stdio transport pattern

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| HTTP/REST | Requires running a server, adds network complexity for local-only app |
| Named pipes | Platform-specific implementations, more complex |
| Embedded Python (pyodide) | Heavy, compatibility issues with native dependencies |
| gRPC | Overkill for simple request-response, adds protobuf dependency |

**Implementation Notes**:
- Main process spawns Python processes on-demand
- Use `child_process.spawn` with stdio pipes
- JSON-RPC 2.0 message format for requests/responses
- Pool Python processes if performance becomes an issue

---

### 2. Internationalization (I18N) Strategy

**Question**: How to implement Constitution Article XI (I18N from the start)?

**Decision**: Use react-i18next with JSON resource bundles

**Rationale**:
- react-i18next is the de facto standard for React i18n
- JSON bundles are easy to translate and maintain
- Supports interpolation, pluralization, and context
- Can lazy-load language bundles
- Works well with TypeScript (typed keys)

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| FormatJS/react-intl | More complex setup, ICU message format less familiar |
| LinguiJS | Smaller community, less documentation |
| Custom solution | Unnecessary when mature libraries exist |

**Implementation Notes**:
- Default language: English (en)
- Initial supported languages: en (defer additional languages to post-v4.0.0)
- All user-facing strings in `src/renderer/i18n/locales/{lang}.json`
- Date/number formatting via Intl API (browser-native)
- TypeScript extraction tooling to catch missing keys

---

### 3. OS File Association Registration

**Question**: How to register the app as a handler for REP files (right-click "Open with")?

**Decision**: Use electron-builder file associations configuration

**Rationale**:
- electron-builder supports native file associations in build config
- Handles all three platforms (Windows registry, macOS Info.plist, Linux .desktop)
- Single configuration point in `electron-builder.yml`

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Manual registration scripts | Platform-specific, maintenance burden |
| Installer-only registration | Misses portable/development scenarios |

**Implementation Notes**:
```yaml
# electron-builder.yml
fileAssociations:
  - ext: rep
    name: REP File
    description: Debrief REP Track Data
    mimeType: application/x-debrief-rep
    role: Editor
```
- App receives file path via `process.argv` (production) or `app.on('open-file')` (macOS)
- Electron main process extracts file path and passes to renderer

---

### 4. Storybook Deployment for Beta Preview

**Question**: How to deploy Storybook for community feedback (User Story P3)?

**Decision**: Deploy to GitHub Pages via GitHub Actions

**Rationale**:
- Free hosting for public repos
- Automatic deployment on push to main
- No infrastructure to maintain
- Consistent with open-source community practices

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Chromatic | Paid service, overkill for preview-only use |
| Netlify/Vercel | Additional account/config, not needed for static site |
| Self-hosted | Maintenance burden, infrastructure cost |

**Implementation Notes**:
- GitHub Action triggers on changes to `apps/loader/stories/**`
- Builds Storybook static site
- Deploys to `gh-pages` branch
- URL: `https://debrief.github.io/debrief-future/loader-storybook/`
- Add link to GitHub Discussion for feedback collection

---

### 5. Partial Write Cleanup Strategy

**Question**: How to handle cleanup if app closes during processing (FR-014)?

**Decision**: Use write-ahead logging pattern with cleanup on startup

**Rationale**:
- Before starting any write operation, log intent to a marker file
- On successful completion, remove marker
- On app startup, check for marker and roll back incomplete operations
- Simple, reliable, no external dependencies

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Database transactions | No database in frontend, would require service change |
| Atomic file operations | Not always possible across multiple files/directories |
| Ignore partial writes | Violates Constitution Article I.3 (no silent failures) |

**Implementation Notes**:
- Marker file: `~/.config/debrief/loader-pending-operation.json`
- Contains: operation type, target store, target plot, timestamp
- Cleanup logic in Electron main process `app.on('ready')`
- Delegate actual cleanup to debrief-stac service

---

### 6. Service Bundling & Deployment

**Question**: How does the Electron app locate and run the Python services?

**Decision**: Bundle Python services inside the Electron app at known relative paths

**Rationale**:
- Services are integral to the app — they should ship together
- Known relative paths eliminate discovery complexity
- Single debrief-stac instance handles all catalog operations (path passed per call)
- debrief-config scope is limited to user data (STAC store locations), not Debrief internals

**Architecture**:
```
Debrief Loader.app/
├── Contents/
│   ├── MacOS/
│   │   └── Debrief Loader      # Electron executable
│   └── Resources/
│       ├── app/                 # Renderer bundle
│       └── services/            # Bundled Python services
│           ├── debrief-io       # Frozen executable (PyInstaller)
│           └── debrief-stac     # Frozen executable (PyInstaller)
```

**Service Interaction Model**:
- **debrief-io**: Stateless — spawn per parse request, or keep warm for session
- **debrief-stac**: Single long-running instance — receives store paths with each request (no config dependency); caches internally, invalidates if paths change
- **debrief-config**: TypeScript library imported directly (no IPC)

**Store Path Passing**:
```typescript
// Electron app reads stores from config
const storePaths = debriefConfig.getStores().map(s => s.path);

// Pass paths with each debrief-stac request
stacService.listPlots({ stores: storePaths, target: 'Project Alpha' });
stacService.addFeatures({ stores: storePaths, target: 'Project Alpha', ... });

// Future: cross-catalog queries
stacService.searchPlots({ stores: storePaths, query: 'Neptune' });

// User adds a store mid-session → next call includes new path
// debrief-stac detects paths changed → invalidates cache
```

This means:
- debrief-stac has no config file dependency
- Could be reused by other tools with different config approaches
- Cache invalidation is simple: hash paths array, compare on each request
- Electron app is the single source of truth for "which stores to use"

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Separate install | Poor UX, version mismatch risk, "works on my machine" issues |
| Discover via PATH | Unreliable, different environments |
| Store paths in debrief-config | Conflates user data config with app internals |

**Implementation Notes**:
- Use PyInstaller to create single-file executables for each service
- Executables live at `process.resourcesPath + '/services/debrief-io'` (etc.)
- Build pipeline produces platform-specific service binaries
- Services versioned together with Electron app release

---

### 7. First-Run Experience (No Stores Configured)

**Question**: What happens when user has no STAC stores configured?

**Decision**: Prompt user to either create a local store or add a remote server (future)

**Rationale**:
- Don't assume local storage is preferred — organisations may use central servers
- Give user explicit choice rather than silently creating directories
- "Create local store" is the recommended/default option for individual users
- "Add remote server" placeholder for future capability

**Flow**:
```
┌─────────────────────────────────────────────┐
│  Debrief Loader                        [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Loading: sample-track.rep                  │
│  ─────────────────────────────              │
│                                             │
│  ⚠️  No STAC stores configured              │
│                                             │
│  To load this file, you need a destination  │
│  store. Choose an option:                   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📁 Create local store               │    │
│  │    Set up a new catalog on this     │    │
│  │    computer (recommended)           │    │
│  ├─────────────────────────────────────┤    │
│  │ 🌐 Connect to remote server         │    │
│  │    Add an existing STAC server      │    │
│  │    (coming soon)                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│                              [ Cancel ]     │
└─────────────────────────────────────────────┘
```

**"Create local store" sub-flow**:
- Suggest default location: `~/Documents/Debrief/local-catalog`
- Allow user to browse/change location
- Create catalog structure via debrief-stac
- Register in debrief-config
- Return to main wizard with new store selected

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Auto-create default store | Presumptuous — orgs may not want local data |
| Block until manually configured | Poor UX, requires leaving the app |
| Show error only | Not actionable, frustrating |

**Implementation Notes**:
- Check `debrief-config.getStores().length === 0` on startup
- "Connect to remote" disabled with "(coming soon)" until remote STAC support added
- Default path uses platform-appropriate Documents folder via Electron's `app.getPath('documents')`

---

## Summary

All technical unknowns resolved. Key decisions:

| Topic | Decision |
|-------|----------|
| Python IPC | JSON-RPC over stdio child processes |
| Service deployment | Bundled in Electron app at known paths |
| Service model | Single debrief-stac instance; store paths passed per request (no config dependency) |
| debrief-config scope | User data only (STAC store locations) |
| I18N | react-i18next with JSON bundles |
| File associations | electron-builder config |
| Storybook deploy | GitHub Pages via Actions |
| Partial write cleanup | Write-ahead marker file |
| No stores configured | Prompt to create local or add remote |

**Ready to proceed to Phase 1: Design & Contracts**
