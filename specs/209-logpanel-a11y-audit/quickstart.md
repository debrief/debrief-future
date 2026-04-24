# Quickstart: LogPanel Accessibility Audit

**Feature**: 209-logpanel-a11y-audit
**Audience**: engineers re-running the audit locally or in CI.

## Prerequisites

- Node ≥ 20 with `pnpm` installed (repo baseline).
- All dependencies installed: `pnpm install` at the repo root.
- A clean working tree (the `git_sha` in the report's front matter reflects HEAD at run time).

## One-liner

```sh
pnpm --filter @debrief/components a11y:audit
```

This runs the full audit end-to-end:

1. Builds Storybook (`pnpm build-storybook`) into `shared/components/storybook-static/`.
2. Starts Playwright's `webServer` against the static build on `http://127.0.0.1:6006`.
3. Runs `shared/components/e2e/LogPanel-a11y-axe.spec.ts`:
   - Fetches Storybook's `/index.json`.
   - Filters to entries with `importPath` starting `./src/LogPanel/`.
   - For each story × each theme (`light`, `dark`, `vscode`), navigates to `/iframe.html?id=<storyId>&globals=theme:<theme>`, waits for `#storybook-root > *`, and runs `AxeBuilder.include('#storybook-root').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()`.
   - Writes the raw JSON dump to `specs/176-log-panel-ux/evidence/a11y-audit.json` (gitignored).
4. Runs `shared/components/scripts/a11y-audit-report.ts`:
   - Reads the JSON dump + the existing `specs/176-log-panel-ux/evidence/a11y-audit.md` (if any).
   - Preserves `Classification` + `Rationale` from the existing markdown for rules that still appear.
   - Archives rules that previously appeared but no longer do into the `## Resolved Previously` section.
   - Rewrites `specs/176-log-panel-ux/evidence/a11y-audit.md`.
5. Exits non-zero if any finding has `severity ∈ {serious, critical}` at WCAG 2.1 AA.

## Re-running against a dev Storybook

If you already have `pnpm storybook` running on `:6006`:

```sh
STORYBOOK_URL=http://127.0.0.1:6006 \
  pnpm --filter @debrief/components a11y:audit:run-only
```

The `:run-only` variant skips the build step and reuses the running server. Useful during iteration.

## Triage loop (first run)

On first run every new finding defaults to `classification: fix-now`. To triage:

1. Open `specs/176-log-panel-ux/evidence/a11y-audit.md`.
2. For each Finding subsection, set `Classification` to one of:
   - `fix-now` — remediate on this feature branch (default).
   - `accepted` — false positive or acceptable trade-off. Fill `Rationale` with the reason.
   - `deferred` — will be addressed in a follow-up. Fill `Rationale` and set `Backlog ref` to a `#NNN` backlog row.
3. Save the markdown. **Do not hand-edit any other field** — the post-processor regenerates everything except classification + rationale + backlog_ref.
4. Fix the `fix-now` items in source code.
5. Re-run `pnpm --filter @debrief/components a11y:audit`. Classifications carry over; fixed rules disappear from the live Findings list and move to `## Resolved Previously`.
6. Repeat until runner exits zero.

## CI

Not yet wired into `.github/workflows/ci.yml`. The runner is gate-capable (exits non-zero on serious/critical). To promote to CI, add a step after the existing Playwright install:

```yaml
- name: LogPanel a11y audit
  run: pnpm --filter @debrief/components a11y:audit
```

Decision to adopt is a follow-up — not shipped in this feature (see research.md §R7).

## Troubleshooting

### "No LogPanel stories found"
The runner filters on `importPath.startsWith('./src/LogPanel/')`. If a LogPanel story was moved outside that directory, the filter will miss it. Check `http://127.0.0.1:6006/index.json` and confirm entries have the expected `importPath`.

### "axe reports violations from Storybook chrome"
The runner scopes to `#storybook-root`. If axe is still reporting chrome-level nodes, Storybook's iframe structure may have changed — inspect `/iframe.html?id=logpanel--timeline-default` in a browser and confirm the render container's id.

### "Flaky color-contrast results"
Color-contrast checks depend on reliably-computed backgrounds. If a story renders over a transparent container, axe may report false positives intermittently. Options: (a) classify as `accepted` with rationale, or (b) add a background color to the Storybook preview body. Prefer (a) unless the issue is widespread.

### "Cloud session — no system browser"
The runner uses `@sparticuz/chromium` via `shared/components/playwright.config.ts` (already wired). No extra action needed.

### "Re-run wiped my classifications"
The post-processor preserves classifications by `rule_id`. If a classification vanished, either (a) the rule's `rule_id` changed (unlikely across axe minor versions), or (b) the existing markdown was malformed and could not be parsed. Check `git diff` on the markdown to recover.

## Evidence produced (what to PR)

- **Committed**: `specs/176-log-panel-ux/evidence/a11y-audit.md`
- **Committed**: any `fix-now` code changes to `shared/components/src/LogPanel/**`
- **Committed**: `shared/components/package.json` (new dep + new script)
- **Committed**: `shared/components/e2e/LogPanel-a11y-axe.spec.ts`
- **Committed**: `shared/components/scripts/a11y-audit-report.ts`
- **Committed**: root `.gitignore` (add the JSON dump path)
- **Not committed**: `specs/176-log-panel-ux/evidence/a11y-audit.json` (transient dump)

## Success criteria checklist

Map back to spec SC-001–SC-006:

- [ ] **SC-001** Coverage matrix has no gaps across all LogPanel/ParameterEditor stories × 3 themes.
- [ ] **SC-002** `fix_now_remaining: 0` in front matter at PR time; zero serious/critical violations at WCAG 2.1 AA.
- [ ] **SC-003** Every `deferred` finding cites a backlog ref.
- [ ] **SC-004** End-to-end run completes in under five minutes.
- [ ] **SC-005** Adding a new LogPanel story requires zero edits to the runner or the script.
- [ ] **SC-006** Front matter records `git_sha`, `captured_at`, `axe_version`, `storybook_version`.
