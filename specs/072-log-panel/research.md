# Research: Log Panel (072)

**Date**: 2026-02-09
**Feature**: 072-log-panel
**Status**: Complete

## Decision 1: Panel Registration Pattern

**Decision**: Follow the existing ActivityPanelViewProvider pattern — implement `vscode.WebviewViewProvider` with a separate view container in the activity bar.

**Rationale**: The existing Debrief Activity Panel (`debrief.activityPanel`) uses this exact pattern. The Log Panel needs its own activity bar icon (per SRD Section 3.3 and UX spec), so it gets a separate `viewsContainers.activitybar` entry alongside the existing Debrief container.

**Alternatives considered**:
- Embedding the Log Panel as a tab within the existing Activity Panel → rejected because the UX spec explicitly requires a separate activity bar icon for mode-switching between analysis and retrospection
- Using a WebviewPanel (full editor tab) → rejected because the SRD specifies sidebar placement

## Decision 2: State Management for Timeline Data

**Decision**: Subscribe to session-state store changes via `subscribeToSelection()` and a new timeline subscription. The webview receives timeline data as serialized messages from the provider, not by accessing the store directly.

**Rationale**: This follows the existing message-passing pattern (extension ↔ webview). The webview runs in an isolated iframe and cannot access the session-state store directly. The provider subscribes to store changes and posts messages to the webview.

**Alternatives considered**:
- Direct store access from webview → impossible (sandboxed iframe)
- Polling from webview → wasteful, introduces latency
- SharedWorker bridge → over-engineered for this use case

## Decision 3: Timeline Assembly Location

**Decision**: Call `logService.getTimeline()` from the LogPanelViewProvider (extension host), serialize the result, and send it to the webview as a message. Filtering and view mode switching happen in the webview (React component logic).

**Rationale**: `getTimeline()` returns the deduplicated, sorted list from the session-state store. This is the authoritative source. Client-side filtering in the webview is appropriate because the dataset is small (max 500 entries per spec) and avoids round-trips.

**Alternatives considered**:
- Filter on extension side → creates unnecessary message latency for interactive search
- Full-text search index → over-engineered for 500 entries

## Decision 4: Feature Selection on Entry Click

**Decision**: When the analyst selects a Log entry, call `store.setSelection()` with the entry's `used` and `generated` feature IDs. This replaces the current map selection (per clarification: retrospection mode).

**Rationale**: Clarified during `/speckit.clarify` — opening the Log Panel is a mode switch to retrospection. Reusing the existing selection mechanism means no new highlight layer is needed.

**Alternatives considered**:
- Separate highlight layer → rejected in clarification (unnecessary complexity; mode-switch justifies selection replacement)

## Decision 5: Presentation Mode Persistence

**Decision**: Use `vscode.getState()` / `vscode.setState()` in the webview to persist the presentation mode. This survives panel close/reopen within a session. For cross-session persistence, use `context.globalState`.

**Rationale**: The existing Activity Panel already uses `vscode.getState()` for collapse state persistence. Presentation mode follows the same pattern. `globalState` provides cross-session durability.

**Alternatives considered**:
- VS Code `workspace.getConfiguration()` → heavier, designed for user settings; presentation mode is a transient UI preference
- Session-state store → wrong layer; presentation mode is a UI concern, not document data

## Decision 6: Shared Component Architecture

**Decision**: Create shared React components in `shared/components/src/LogPanel/` that are framework-agnostic (no VS Code imports). The webview entry script (`apps/vscode/src/webview/web/logPanel.tsx`) bridges VS Code messages to component props.

**Rationale**: This follows the existing pattern where `@debrief/components` exports framework-agnostic components (ActivityPanel, TimeController, FeatureList) and the webview entry script adapts them to the VS Code message protocol.

**Alternatives considered**:
- Monolithic component in the extension → prevents reuse in web-shell or Storybook
- Separate npm package for Log Panel → over-engineered; shared/components is the right home

## Decision 7: Operation Category Classification

**Decision**: Derive operation category from the `wasGeneratedBy.tool` field using a static mapping. Categories: `calculation`, `import`, `property-edit`, `export`. Default to `calculation` for unknown tools.

**Rationale**: The Log Entry schema stores the tool ID in `wasGeneratedBy.tool`. A mapping from tool ID prefixes to categories can be maintained alongside the tool registry. This avoids adding a `category` field to the Log Entry schema.

**Alternatives considered**:
- Add `category` field to LogEntry schema → rejected; schema change not needed for display-only concern
- Let tools self-report category → requires updating all tool implementations; classification is a UI concern

## Decision 8: Internationalization Approach

**Decision**: All user-facing strings in shared components will be string constants defined in a dedicated strings module, ready for future externalization. No i18n framework is introduced in this phase.

**Rationale**: Constitution Article XI requires user-facing strings to be externalisable. Extracting strings to constants is the minimal first step. A full i18n framework (like react-intl) is premature for a single panel.

**Alternatives considered**:
- Inline strings → violates Constitution XI
- Full i18n framework (react-intl, i18next) → over-engineered for Phase 2

## Decision 9: Webview Bundling

**Decision**: Add a new esbuild entry point at `apps/vscode/src/webview/web/logPanel.tsx` that bundles to `dist/webview/logPanel.js`. Follow the existing activityPanel pattern.

**Rationale**: The existing build pipeline already handles multiple webview entry points (activityPanel, mapPanel). Adding another follows the established convention.

**Alternatives considered**:
- Shared bundle with Activity Panel → rejected; separate panels need separate bundles for independent loading
