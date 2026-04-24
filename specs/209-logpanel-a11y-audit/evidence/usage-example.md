# Usage — Running the LogPanel A11y Audit

Feature **209-logpanel-a11y-audit** adds two concrete capabilities:

1. **Theme-aware storybook rendering** — LogPanel (and any other component
   using `--vscode-*` CSS variables) now updates its colours live when the
   Storybook global theme selector switches between Light, Dark, and VS Code.
2. **Automated a11y audit** — a Playwright + axe-core suite that scans six
   representative LogPanel stories across all three theme variants.

This page shows how to exercise both from a fresh checkout.

## 1 — Verify the theme fix

```bash
cd shared/components
pnpm install                # first time only
pnpm storybook              # launches Storybook at http://localhost:6006
```

1. Open the **LogPanel → Timeline Default** story.
2. Use the paintbrush icon in the toolbar to switch between **Light**,
   **Dark**, and **VS Code** themes.
3. Confirm the panel background, borders, and text re-colour immediately on
   each switch — no reload, no flash.

Before #209 the panel rendered with the hard-coded dark fallbacks regardless
of the active theme (because `--vscode-*` vars were unset).

## 2 — Run the audit locally

```bash
# Local dev (macOS / Windows native chromium)
cd shared/components
pnpm install
pnpm exec playwright install chromium
pnpm test:e2e LogPanelA11y.spec.ts
```

```bash
# Cloud Claude Code / CI (Linux, bundled @sparticuz/chromium)
cd shared/components
pnpm install
CLAUDE_CODE=1 pnpm test:e2e LogPanelA11y.spec.ts
```

The spec:

- Loads each story at `/iframe.html?id=logpanel--<id>&globals=theme:<variant>`.
- Runs any declared pre-audit interaction (e.g. click first card for the
  selected-state story, flip the card for the flip-card story).
- Runs `AxeBuilder().withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`.
- Accumulates violations and writes
  `evidence/176-log-panel-ux/a11y-audit.md` in an `afterAll` hook.
- Asserts zero critical/serious violations.

## 3 — Read the report

Open `evidence/176-log-panel-ux/a11y-audit.md`. The report contains:

- A severity summary (critical/serious/moderate/minor counts).
- A "Runs" table with violation counts per story×theme.
- A "Violations" section grouped by story+theme, with rule ID, severity,
  affected element(s), description, and fix hint.

## 4 — Adding new LogPanel stories

When you add a new story that should be part of the audit:

1. Append an entry to the `STORIES` array at the top of
   `shared/components/e2e/LogPanelA11y.spec.ts`:

   ```ts
   { id: 'my-new-story', label: 'MyNewStory — what it shows' }
   ```

2. If the new story needs user interaction before auditing (e.g. a click on
   a disclosure), add an `interact:` callback.

3. Re-run the suite. The report regenerates with the new story included.

## 5 — Adding new `--vscode-*` variables

If a new LogPanel sub-component uses a `--vscode-*` variable not already in
`vsCodeTokenMap.ts`, add entries for **both** `light` and `dark` variants.
`vsCodeTokenMap.test.ts` enforces structural parity — it will fail loudly if
one variant is missing a key the other has.
