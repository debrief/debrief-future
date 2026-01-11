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

### 6. Python Service Discovery

**Question**: How does the Electron app find the Python service executables?

**Decision**: Bundle Python services as package scripts, discover via debrief-config paths

**Rationale**:
- debrief-config (Stage 3) already manages paths and configuration
- Python packages installed via uv provide entry points
- Electron app queries debrief-config for service locations
- Graceful fallback if services not installed (show setup instructions)

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Hardcoded paths | Breaks portability, different install locations |
| Bundled Python runtime | Massive app size, update complexity |
| User-configured paths | Poor UX, error-prone |

**Implementation Notes**:
- On startup: `debrief-config get-service-paths` returns JSON with service locations
- Services expected at: `debrief-io`, `debrief-stac` entry points
- If not found: display "Services not installed" with setup link
- Cache service paths for session duration

---

## Summary

All technical unknowns resolved. Key decisions:

| Topic | Decision |
|-------|----------|
| Python IPC | JSON-RPC over stdio child processes |
| I18N | react-i18next with JSON bundles |
| File associations | electron-builder config |
| Storybook deploy | GitHub Pages via Actions |
| Partial write cleanup | Write-ahead marker file |
| Service discovery | Query debrief-config |

**Ready to proceed to Phase 1: Design & Contracts**
