# Playwright + Storybook Integration Proposal

**Date**: 2026-02-05
**Status**: Proposal
**Purpose**: Integrate automated Playwright testing of Storybook stories into the speckit workflow

## Executive Summary

This proposal outlines how to integrate Playwright e2e testing into the speckit workflow to automatically test UI components via their Storybook stories. This creates a tight feedback loop: **implement → story → e2e test → evidence**.

### Key Benefits

1. **Automated visual regression** - Catch UI breakages before PR
2. **Theme variant coverage** - Test light/dark/vscode themes automatically
3. **Evidence generation** - Screenshots captured for PR descriptions and blog posts
4. **Accessibility validation** - Run a11y checks as part of e2e tests
5. **Faster feedback** - Tests run in Claude Code sessions (verified working)

## Current State

### Existing Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| Playwright config | ✅ Exists | `shared/components/playwright.config.ts` |
| Storybook setup | ✅ Exists | `shared/components/.storybook/` |
| Theme decorators | ✅ Exists | `ContextDecorator.tsx` (light/dark/vscode) |
| Example e2e test | ✅ Exists | `e2e/ToolMatchHarness.spec.ts` |
| CI integration | ✅ Exists | `.github/workflows/ci.yml` |

### Existing Test Pattern

```typescript
// e2e/ToolMatchHarness.spec.ts
const STORY_URL = '/iframe.html?id=toolmatch-harness--default';

test('should show only Global Statistics as active', async ({ page }) => {
  await page.goto(STORY_URL);
  await page.waitForSelector('[data-testid="tool-match-harness"]');

  const globalStats = page.locator('[data-testid="tool-global-statistics"]');
  await expect(globalStats).toHaveAttribute('data-active', 'true');
});
```

## Proposed Integration Points

### 1. Plan Template Addition

**File**: `.specify/templates/plan-template.md`

Add new section after "Media Components":

```markdown
## Storybook E2E Testing

*Identify which Storybook stories require automated Playwright tests. Skip if feature has no visual components.*

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ComponentName.stories.tsx` | Rendering, accessibility | light, dark, vscode | [click, fill, etc.] |

**Testing Strategy**:
- [ ] Component renders correctly in all theme variants
- [ ] Interactive elements respond to user input
- [ ] Accessibility checks pass (axe-core)
- [ ] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/{ComponentName}.spec.ts`
```

### 2. Tasks Template Addition

**File**: `.specify/templates/tasks-template.md`

Add to User Story phases (when UI component involved):

```markdown
### E2E Tests for User Story X (REQUIRED for UI components)

> **NOTE**: E2E tests verify the story works in browser context

- [ ] TXXX [P] [USX] Create Playwright test `shared/components/e2e/{Component}.spec.ts`
- [ ] TXXX [P] [USX] Add theme variant tests (light, dark, vscode)
- [ ] TXXX [P] [USX] Add interaction tests for user flows
- [ ] TXXX [USX] Run e2e tests and verify pass: `pnpm --filter @debrief/components test:e2e`
```

Add to Evidence Collection in Polish phase:

```markdown
### E2E Evidence Collection

- [ ] TXXX Run full e2e suite: `pnpm --filter @debrief/components test:e2e`
- [ ] TXXX Capture theme variant screenshots in `specs/[feature]/evidence/screenshots/`
- [ ] TXXX Document test results in `evidence/e2e-summary.md`
```

### 3. Implement Command Enhancement

**File**: `.claude/commands/speckit.implement.md`

Add to "Implementation patterns by task type":

```markdown
- **E2E test tasks**: Playwright tests for Storybook stories
  - Create test file in `shared/components/e2e/`
  - Use story URL pattern: `/iframe.html?id=category-component--variant`
  - Test all theme variants using URL parameters
  - Capture screenshots for evidence: `await page.screenshot({ path: '...' })`
  - Run via: `pnpm --filter @debrief/components test:e2e {testfile}`
```

### 4. New E2E Test Generator Utility

Create: `.specify/templates/e2e-test-template.ts`

```typescript
/**
 * Playwright e2e test template for Storybook stories.
 *
 * Usage: Copy and customize for new UI components.
 */

import { test, expect } from '@playwright/test';

// Story URL constants - update with actual story IDs
const STORIES = {
  default: '/iframe.html?id=category-component--default',
  variant1: '/iframe.html?id=category-component--variant-1',
  // Theme variants use globals parameter
  lightTheme: '/iframe.html?id=category-component--default&globals=theme:light',
  darkTheme: '/iframe.html?id=category-component--default&globals=theme:dark',
  vscodeTheme: '/iframe.html?id=category-component--default&globals=theme:vscode',
};

test.describe('ComponentName', () => {
  test.describe('Rendering', () => {
    test('renders default state', async ({ page }) => {
      await page.goto(STORIES.default);
      await page.waitForSelector('[data-testid="component-root"]');

      // Verify component rendered
      const root = page.locator('[data-testid="component-root"]');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Theme Variants', () => {
    test('renders correctly in light theme', async ({ page }) => {
      await page.goto(STORIES.lightTheme);
      await page.waitForSelector('[data-testid="component-root"]');
      await expect(page.locator('[data-testid="component-root"]')).toBeVisible();
    });

    test('renders correctly in dark theme', async ({ page }) => {
      await page.goto(STORIES.darkTheme);
      await page.waitForSelector('[data-testid="component-root"]');
      await expect(page.locator('[data-testid="component-root"]')).toBeVisible();
    });

    test('renders correctly in vscode theme', async ({ page }) => {
      await page.goto(STORIES.vscodeTheme);
      await page.waitForSelector('[data-testid="component-root"]');
      await expect(page.locator('[data-testid="component-root"]')).toBeVisible();
    });
  });

  test.describe('Interactions', () => {
    test('responds to click', async ({ page }) => {
      await page.goto(STORIES.default);
      await page.waitForSelector('[data-testid="component-root"]');

      await page.click('[data-testid="button"]');

      // Verify state change
      await expect(page.locator('[data-testid="result"]')).toHaveText('Clicked');
    });
  });
});

test.describe('Screenshot Capture', () => {
  test('capture default state', async ({ page }) => {
    await page.goto(STORIES.default);
    await page.waitForSelector('[data-testid="component-root"]');
    await page.waitForTimeout(300); // Allow animations

    await page.screenshot({
      path: 'screenshots/component-default.png',
      fullPage: false,
    });
  });

  test('capture all theme variants', async ({ page }) => {
    for (const [name, url] of [
      ['light', STORIES.lightTheme],
      ['dark', STORIES.darkTheme],
      ['vscode', STORIES.vscodeTheme],
    ]) {
      await page.goto(url);
      await page.waitForSelector('[data-testid="component-root"]');
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `screenshots/component-${name}.png`,
        fullPage: false,
      });
    }
  });
});
```

## Claude Code Session Compatibility

### Verified Working Configuration

Per research in `docs/project_notes/playwright-installation-research.md`:

```bash
# Skip default browser downloads (blocked in Claude Code)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test playwright-chromium

# Install bundled Chromium
npm install @sparticuz/chromium
```

**playwright.config.ts** addition for Claude Code:

```typescript
// Add to launchOptions for Claude Code compatibility
launchOptions: {
  executablePath: process.env.CLAUDE_CODE ? '/tmp/chromium' : undefined,
  args: process.env.CLAUDE_CODE ? [
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--no-zygote',
    '--disable-gpu',
    '--disable-dev-shm-usage',
  ] : [],
},
```

### Limitation: No External Network

Tests cannot use `page.goto('https://...')` in Claude Code sessions. All tests must use:
- Storybook stories (localhost:6006)
- `page.setContent()` for HTML injection

## Workflow Integration

### Feature with UI Component

```mermaid
graph TD
    A[/speckit.specify] --> B[/speckit.plan]
    B --> |UI Component?| C[Add to Media Components]
    B --> |UI Component?| D[Add to E2E Testing section]
    D --> E[/speckit.tasks]
    E --> |Generate| F[E2E test tasks]
    F --> G[/speckit.implement]
    G --> H[Create Storybook story]
    H --> I[Create Playwright test]
    I --> J[Run tests]
    J --> |Pass| K[Capture screenshots]
    K --> L[Evidence collection]
    L --> M[/speckit.pr]
```

### Example Task Generation

For a feature adding `CatalogOverview` component:

```markdown
## Phase 3: User Story 1 - View STAC Catalog Contents (Priority: P1)

### Implementation
- [ ] T101 [US1] Create CatalogOverview component `shared/components/src/CatalogOverview.tsx`
- [ ] T102 [US1] Add CatalogOverview styles `shared/components/src/CatalogOverview.css`
- [ ] T103 [US1] Create Storybook story `shared/components/stories/CatalogOverview.stories.tsx`

### E2E Tests for User Story 1
- [ ] T104 [P] [US1] Create Playwright test `shared/components/e2e/CatalogOverview.spec.ts`
- [ ] T105 [P] [US1] Add theme variant tests (light, dark, vscode)
- [ ] T106 [US1] Run e2e tests: `pnpm --filter @debrief/components test:e2e CatalogOverview`

## Phase N: Polish

### Evidence Collection
- [ ] T501 Run full e2e suite and capture results
- [ ] T502 [P] Capture theme screenshots to `specs/042-catalog-overview/evidence/screenshots/`
- [ ] T503 Document e2e results in `evidence/e2e-summary.md`
```

## Implementation Checklist

### Phase 1: Template Updates

- [ ] Update `plan-template.md` with E2E Testing section
- [ ] Update `tasks-template.md` with e2e task patterns
- [ ] Update `speckit.implement.md` with e2e guidance
- [ ] Create `e2e-test-template.ts` utility

### Phase 2: Config Updates

- [ ] Add Claude Code compatibility to `shared/components/playwright.config.ts`
- [ ] Add `@sparticuz/chromium` to devDependencies
- [ ] Create `test:e2e:claude` script for Claude Code sessions

### Phase 3: Documentation

- [ ] Update `docs/storybook-vscode-theming.md` with e2e testing info
- [ ] Add e2e testing section to `ARCHITECTURE.md`
- [ ] Create `docs/e2e-testing-guide.md`

## Evidence Template

### e2e-summary.md format

```markdown
# E2E Test Summary

**Feature**: [Feature Name]
**Date**: [Date]
**Test Location**: `shared/components/e2e/{Component}.spec.ts`

## Results

| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| Rendering | X | 0 | 0 |
| Theme Variants | 3 | 0 | 0 |
| Interactions | X | 0 | 0 |
| Screenshots | X | 0 | 0 |

## Theme Variant Coverage

- [x] Light theme
- [x] Dark theme
- [x] VS Code theme

## Screenshots Captured

| Screenshot | Purpose |
|------------|---------|
| `screenshots/component-default.png` | Default state |
| `screenshots/component-light.png` | Light theme |
| `screenshots/component-dark.png` | Dark theme |
| `screenshots/component-vscode.png` | VS Code theme |

## Notes

[Any special considerations or known issues]
```

## Summary

This integration adds systematic Playwright testing to the speckit workflow:

1. **Plan phase**: Identify stories needing e2e tests
2. **Tasks phase**: Generate e2e test tasks alongside implementation
3. **Implement phase**: Create tests using template, run in Storybook
4. **Evidence phase**: Capture screenshots and test results
5. **PR phase**: Include evidence in PR description

The approach leverages existing infrastructure (Storybook, Playwright config, CI) while adding explicit workflow integration points.
