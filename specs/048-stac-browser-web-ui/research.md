# Research: STAC Browser Web UI

**Feature**: 048-stac-browser-web-ui
**Date**: 2026-02-04

## Overview

This document records technical research and decisions for the STAC Browser Web UI integration test shell.

## Decision 1: Build Tool Selection

**Decision**: Use Vite 5.x

**Rationale**:
- Already used in `shared/components` for Storybook
- Native ESM support enables fast dev server startup
- Path alias configuration straightforward via `resolve.alias`
- TypeScript support via esbuild (fast compilation)

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Vite | Fast, ESM-native, familiar | None significant | **Selected** |
| webpack | Mature, flexible | Slower, more config | Rejected |
| Parcel | Zero-config | Less control over aliases | Rejected |

## Decision 2: Fixture Data Access

**Decision**: Import via Vite path alias `@test-data` → `apps/vscode/test-data/`

**Rationale**:
- Single source of truth (no duplicate fixtures)
- Changes to test data automatically reflected
- Vite handles JSON/GeoJSON imports natively
- Path alias keeps imports clean

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Path alias import | Single source, clean imports | Cross-package reference | **Selected** |
| Copy fixtures | Isolated, no cross-refs | Duplication, drift risk | Rejected |
| Symlink | Single source | Platform-specific issues | Rejected |

**Configuration Required**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@test-data': path.resolve(__dirname, '../vscode/test-data'),
    },
  },
});
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@test-data/*": ["../vscode/test-data/*"]
    }
  }
}
```

## Decision 3: Mock Service Architecture

**Decision**: In-process JavaScript classes with same interface as real services

**Rationale**:
- No network latency
- Validates API contracts
- Simple to implement and debug
- Features can be tested without VS Code runtime

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| In-process mocks | Simple, fast, contract-valid | Limited to static data | **Selected** |
| MSW (Mock Service Worker) | Network-realistic | Overkill for bundled data | Rejected |
| HTTP mock server | True network testing | Complexity, startup time | Rejected |

## Decision 4: UI Architecture

**Decision**: Two-view state machine (welcome → analysis)

**Rationale**:
- Matches VS Code's panel lifecycle (no plot open → plot open)
- Clear separation of concerns
- Simple React state (`view: 'welcome' | 'analysis'`)
- Enables isolated testing of each view

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Two-view state | Simple, matches VS Code | More code than single view | **Selected** |
| Single view (all panels) | Less code | Doesn't match VS Code UX | Rejected |
| React Router | URL-driven | Overkill for 2 views | Rejected |

## Decision 5: Selection State Management

**Decision**: Use `useSelection` hook from `@debrief/components`

**Rationale**:
- Already implemented and tested
- Provides `selectedIds`, `toggle`, `clear` interface
- Consistent with VS Code activity panel usage
- No need to reimplement selection logic

**No alternatives considered** — hook exists and works.

## Decision 6: Temporal State Management

**Decision**: Use `@debrief/session-state` Zustand store

**Rationale**:
- Same store used by VS Code
- Provides `currentTime`, `timeRange`, `displayMode`
- Subscription helpers (`subscribeToTemporal`) already exist
- Validates that store works outside VS Code context

**No alternatives considered** — package exists and is required by spec.

## Decision 7: Mock Tool Implementation

**Decision**: Implement 2 tools using @turf/turf

**Rationale**:
- @turf/turf is a standard GeoJSON processing library
- Demonstrates tool execution flow without Python
- `track-length` and `bounding-box` are simple to implement
- Already a dependency of `@debrief/components`

**Tool Specifications**:

| Tool | Input | Output | Implementation |
|------|-------|--------|----------------|
| track-length | 1+ tracks | message with total km | `turf.length()` sum |
| bounding-box | 1+ tracks | bbox polygon feature | `turf.bbox()` + `turf.bboxPolygon()` |

## Open Questions (Resolved)

All technical questions were resolved during clarification:

1. ~~Fixture data location~~ → Use existing `apps/vscode/test-data/local-store/`
2. ~~UI architecture~~ → Two-view (welcome page + analysis view)
3. ~~How to access fixtures~~ → Path alias `@test-data`

## Dependencies to Add

```json
// apps/web-shell/package.json
{
  "dependencies": {
    "@debrief/components": "workspace:*",
    "@debrief/session-state": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

Note: `@turf/turf` is already a transitive dependency of `@debrief/components`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Component props don't match expected interface | Low | Medium | Check component exports before implementation |
| Fixture data format incompatible | Low | Low | Test data already used by VS Code tests |
| Vite path alias issues with pnpm | Medium | Low | Test alias resolution early |
| Playwright flaky on CI | Medium | Medium | Use stable selectors, add retry config |

## Conclusion

All technical decisions are straightforward. The feature primarily composes existing components with minimal new code. Main implementation effort is:
1. Vite/TypeScript configuration with path alias
2. Mock services (~50 lines each)
3. App.tsx two-view shell (~100 lines)
4. Playwright tests (~100 lines total)

Estimated new code: ~300-400 lines TypeScript + configuration files.
