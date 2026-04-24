# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Media Components

*Identify Storybook stories to bundle for blog post demos. This section is optional - skip if the feature has no visual components.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| [Name] | `path/to/Story.stories.tsx` | `component-name.js` | [What it demonstrates] |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook
- [ ] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/[story-id]`

*If no components identified, write "None - backend/infrastructure feature"*

## Storybook E2E Testing

*Identify which Storybook stories require automated Playwright tests. Skip if feature has no visual components.*

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT omit E2E tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Full details: `docs/project_notes/playwright-installation-research.md`

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ComponentName.stories.tsx` | Rendering, accessibility | light, dark, vscode | [click, fill, hover, etc.] |

**Testing Strategy**:
- [ ] Component renders correctly in all theme variants
- [ ] Interactive elements respond to user input
- [ ] Accessibility attributes present (data-testid, aria-*)
- [ ] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/{ComponentName}.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=category-component--story-name&globals=theme:light
/iframe.html?id=category-component--story-name&globals=theme:dark
/iframe.html?id=category-component--story-name&globals=theme:vscode
```

*If no e2e tests needed, write "None - no interactive UI components"*

## Web-Shell E2E Testing

*Identify extension workflows that require end-to-end testing. Skip if the feature has no extension workflow changes. This is the path for any workflow-level screenshots destined for evidence/blog.*

> **Reference**: `docs/e2e-testing-guide.md` §3 — web-shell architecture, page objects, screenshot/GIF patterns.
>
> The web-shell (`apps/web-shell/`) is a standalone React app hosting the same shared components as the VS Code extension. Driving it with Playwright is the supported path for full-workflow E2E and is the source of record for blog/PR screenshots. Do **not** route workflow tests through openvscode-server / `xvfb-run` — that path (#142) is unreliable and reserved for chrome-level concerns.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| [e.g., Open plot + filter tracks] | MapView, FilterBar, FeatureList | `.leaflet-container`, `[data-testid="filter-bar"]`, `[data-testid="feature-list"]` | load plot, apply filter, verify count |

**Testing Strategy**:
- [ ] Workflow runs end-to-end in the web-shell
- [ ] Page objects in `apps/web-shell/playwright/pages/` extended for new selectors (reuse `AnalysisPage` / `CatalogPage` rather than duplicating)
- [ ] Screenshots and/or interaction GIF written **directly** into `specs/[feature]/evidence/screenshots/` from the spec file (follow the path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`)

**Test File Location**: `apps/web-shell/playwright/tests/{workflow}.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs {workflow}` (auto-provisions `@sparticuz/chromium`)
- Local: `pnpm --filter @debrief/web-shell test {workflow}`

**Optional — chrome-level VS Code Webview tests**:
Only for tests that genuinely require real VS Code chrome (command palette, sidebar host lifecycle, native notifications). See `docs/e2e-testing-guide.md` §4. Not the path for evidence/blog screenshots.

*If no workflow E2E tests needed, write "None - no extension workflow changes"*

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
