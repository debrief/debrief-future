# Research: LogPanel Accessibility Audit (axe-core)

**Feature**: 209-logpanel-a11y-audit
**Date**: 2026-04-24
**Purpose**: Resolve all open questions from `plan.md` Technical Context before design (Phase 1). No `NEEDS CLARIFICATION` markers remain after this document.

---

## R1. A11y scanner choice

**Decision**: Use `@axe-core/playwright ^4.8.5`, pinned to the exact version already declared in `apps/spec-navigator/package.json`.

**Rationale**:
- Named directly by the backlog row (user-specified scope).
- Repo precedent — `apps/spec-navigator/e2e/capture-axe.spec.ts` already uses the same library with the same WCAG tag set. Reusing it avoids a second a11y toolchain and keeps a single mental model.
- MIT-licensed, Deque-maintained, widely adopted; meets Article IX (justified, no vendor lock-in).
- Exact version match (`^4.8.5`) prevents cross-package drift.

**Alternatives considered**:
- **`axe-core` directly + a custom Playwright glue**: More code, no benefit; `@axe-core/playwright` is a thin `AxeBuilder` wrapper that is already the idiomatic integration.
- **Storybook's `@storybook/addon-a11y`**: Already installed (`^8.4.0`) and useful for in-panel developer feedback, but it is interactive-only and does not produce a machine-readable report. The addon complements, rather than replaces, a Playwright-driven audit.
- **Pa11y / Lighthouse CI**: Would add a second a11y vocabulary; no precedent in repo; less control over per-story scoping.

---

## R2. Test harness — Storybook dev server vs. built static Storybook

**Decision**: Drive the audit against a **built static Storybook** (`pnpm --filter @debrief/components build-storybook`) served from `storybook-static/`. The Playwright spec uses Storybook's `webServer.command` to run the dev server if `storybook-static/` is absent, otherwise serves the static build via `http-server` (already transitively available) on a fixed port (6006).

**Rationale**:
- **Reproducibility** (Article I.4): Static Storybook is a deterministic artefact; dev-server HMR can produce transient state that muddies axe results.
- **CI-friendliness**: A future CI gate can build once, audit once — no long-lived dev server process to manage.
- **Speed**: Static serve avoids Vite's first-request compile latency that inflates per-story runtime.
- **Faithful to existing infra**: `apps/spec-navigator` already follows a build-then-drive pattern in CI; this matches.

**Alternatives considered**:
- **Dev-server only**: Simpler local DX (hot reload); but slower and non-deterministic for CI. Keep as fallback when `storybook-static/` is absent.
- **Requires a dev server to be already running**: Fragile — forgetting to start it produces confusing failures.

**Implementation note**: The Playwright config uses `webServer` with a `reuseExistingServer: !process.env.CI` fallback so local developers can point at an already-running `pnpm storybook`.

---

## R3. Story discovery — Storybook `index.json`

**Decision**: Discover stories dynamically from Storybook's own `index.json` (Storybook 7/8 standard), filtered by `importPath` prefix `./src/LogPanel/`. URL: `${STORYBOOK_URL}/index.json`.

**Rationale**:
- Satisfies FR-009 (no static list) and SC-005 (adding a story requires no runner edits).
- `index.json` is Storybook's own stable contract — it does not change across minor version bumps of Storybook 8.x.
- Lets us cover both `LogPanel.stories.tsx` and `ParameterEditor.stories.tsx` with a single predicate (both are under `src/LogPanel/`).

**Index.json shape** (documented, Storybook 8 stable):
```json
{
  "v": 5,
  "entries": {
    "logpanel--timeline-default": {
      "id": "logpanel--timeline-default",
      "title": "LogPanel",
      "name": "TimelineDefault",
      "importPath": "./src/LogPanel/LogPanel.stories.tsx",
      "type": "story",
      "tags": ["story"]
    },
    "logpanel-parametereditor--number-editor": { ... }
  }
}
```

Runner filter: `entry.type === 'story' && entry.importPath.startsWith('./src/LogPanel/')`.

**Alternatives considered**:
- **Glob-match `.stories.tsx` files**: Requires parsing TypeScript export names; fragile for CSF3 (`export const X = {...}`).
- **Hand-curated list in the spec file**: Violates FR-009.
- **`@storybook/test-runner`**: Heavy — spins up its own Vitest-like harness; unnecessary for an a11y-only audit and would add a second test orchestration layer.

---

## R4. Report format — JSON dump + curated markdown

**Decision**: Emit two artefacts per run:
1. **Machine-readable JSON** at `specs/176-log-panel-ux/evidence/a11y-audit.json` — schema `axe-report-v2` (see `contracts/axe-report.schema.json`). **Gitignored** per FR-013.
2. **Curated markdown** at `specs/176-log-panel-ux/evidence/a11y-audit.md` — human-readable, committed, with YAML front matter (`git_sha`, `captured_at`, `axe_version`, `storybook_version`), coverage matrix, aggregated violations table, and classification column.

A separate post-processor (`shared/components/scripts/a11y-audit-report.ts`) transforms the JSON into the markdown. On first run the markdown is regenerated from scratch; subsequent runs merge classifications from the existing markdown into newly-captured findings so that human triage (`fix-now` / `accepted` / `deferred`) is preserved across runs.

**Rationale**:
- **Split capture from presentation** — the Playwright spec stays focused on execution; markdown formatting is a standalone unit-testable concern.
- **Preserve classifications across re-runs** — critical for SC-003. Without merge logic, every re-run wipes the human triage; that would make the audit single-use.
- **Front-matter convention** matches `.specify/templates/evidence/test-summary-template.md` (`git_sha` + `captured_at`), promoting to a freshness-trackable artefact. We extend it with `axe_version` + `storybook_version` because those dominate a11y-report reproducibility.
- **JSON is the source of truth** for machine consumers; markdown is the source of truth for humans. Either can regenerate the other's layout; classifications live only in the markdown.

**Schema extension rationale (`axe-report-v2` vs. spec-navigator's `v1`)**:
- Spec-navigator's v1 records `(state, viewport, violations, passes, incomplete)`. LogPanel's audit needs `(storyId, theme, violations, passes, incomplete)` plus top-level `axe_version`, `storybook_version`, and `coverage_matrix`. Renaming the key and incrementing the schema version is cleaner than overloading v1.
- Spec-navigator is not affected; its v1 file stays where it is.

**Alternatives considered**:
- **Markdown only**: Loses machine-readability; can't diff easily; can't power a CI gate cleanly.
- **JSON only**: Fails SC-001 (report must be human-readable) and makes review painful.
- **Third format (HTML)**: No consumer; extra surface.
- **Single JSON with embedded classifications**: Human editing of JSON is error-prone; markdown tables are the better editing surface.

---

## R5. Axe scoping — scope to story render root

**Decision**: Constrain `AxeBuilder` analysis to `#storybook-root` via `new AxeBuilder({ page }).include('#storybook-root')`. This element is Storybook 8's canonical story render container inside the iframe.

**Rationale**:
- Excludes Storybook's own chrome (toolbar, addon panels) from results — those are not the component under audit (FR-008).
- `apps/spec-navigator` does not scope because it audits full app pages; LogPanel is a component inside an iframe, so scoping is warranted.
- Documented in the evidence markdown per FR-008.

**Alternatives considered**:
- **No include()**: Pollutes results with Storybook-chrome findings that we cannot fix. Rejected.
- **Include `body`**: Equivalent to no scoping for practical purposes in an iframe. Rejected.
- **Per-story include selectors**: Over-specified; every LogPanel story already renders directly into `#storybook-root`. Rejected as unnecessary.

---

## R6. Interaction states (flip cards, selection, parameter editor)

**Decision**: Audit each story in whatever initial state it renders. Do not drive interactions (click, keyboard, flip) during the audit. Violations that only manifest mid-interaction are captured as follow-up backlog items, not in this feature.

**Rationale**:
- Matches spec Edge Case "Interaction-only states".
- Each interaction-state variant is already exposed as its own story (e.g. `EntrySelected`, `DisabledCard`, `FlipCardDefault`), so the static-render approach already captures most branches.
- Driving interactions adds test flake and scope creep; the existing `LogPanel.spec.ts` already covers interaction correctness (not a11y).

**Alternatives considered**:
- **Drive every interaction during the audit**: Scope explosion, test flake, and cross-purposes with the existing interaction test.
- **Audit only initial render, skip selection stories**: Would miss the selection state entirely; existing story variants already cover this cheaply.

---

## R7. CI wiring

**Decision**: Add a `pnpm --filter @debrief/components a11y:audit` script that runs the audit end-to-end (build storybook if needed → run Playwright spec → run post-processor). Do **not** wire into `.github/workflows/ci.yml` in this feature; adoption as a CI gate is tracked as a follow-up (captured as `deferred` in the report's classification if needed).

**Rationale**:
- The runner MUST be gate-capable (FR-010) — and it will be — but actually turning it on as a CI gate is a policy decision separate from the audit itself.
- Mirrors spec-navigator precedent: `AXE_CAPTURE=1` opt-in; not in CI yet.
- Lets the team evaluate audit flake and runtime before binding CI to it.
- Avoids inflating CI minutes in the same PR that ships the audit; smaller PR surface.

**Alternatives considered**:
- **Wire into CI in this feature**: Increases blast radius. If axe flakes, every unrelated PR is blocked. Rejected until flake profile is known.
- **Don't add a script at all**: Makes the audit harder to re-run (hurts SC-004 and SC-005).

---

## R8. Story filter — LogPanel scope boundary

**Decision**: In-scope = any Storybook entry whose `importPath.startsWith('./src/LogPanel/')`. This captures `LogPanel.stories.tsx`, `ParameterEditor.stories.tsx`, and any future sub-component stories added under `src/LogPanel/`.

**Rationale**:
- Tracks the component's own directory, not a keyword in the story title — survives title renames.
- Matches spec assumption "Scope — which stories count as 'LogPanel'".
- Automatically includes any new sub-component story files dropped into `src/LogPanel/`.

**Alternatives considered**:
- **Title-prefix match (`title.startsWith('LogPanel')`)**: Brittle to title edits; also title `'LogPanel/Sub'` vs `'LogPanel'` distinction can drift.
- **Hand-maintained list**: Violates FR-009.

---

## R9. Violation aggregation & de-duplication

**Decision**: Aggregate violations across `(story, theme)` pairs by axe `rule.id`. Each unique rule appears once in the curated markdown's violations table, with an "Affected" column listing every `(storyId, theme)` pair that reproduced it. DOM selector shown in the table is the first one observed (with a note if selectors differ across pairs).

**Rationale**:
- Without aggregation, a single rule violation in one component style can appear 20+ times (once per story × theme). Unreadable.
- Axe rule IDs (e.g. `color-contrast`, `aria-valid-attr`) are the natural de-dup key — they map directly to a fix.
- Pair list preserves the theme-specificity needed to catch theme-only regressions (Edge Case "Theme-only violations").

**Alternatives considered**:
- **No aggregation (one row per violation instance)**: Unreadable at scale; obscures the pattern.
- **Aggregate by `rule.id + selector`**: Over-splits because axe's selector path can vary by DOM depth within otherwise-equivalent stories.

---

## R10. Classification workflow & preservation

**Decision**: The curated markdown contains a "Classification" column with values `fix-now`, `accepted`, or `deferred`, plus a "Rationale" column. On re-run, the post-processor reads the existing markdown, extracts the `(rule.id → {classification, rationale})` mapping, and re-applies it to the freshly-captured violations set. Unknown rules (first-time) default to `fix-now` with empty rationale; rules that no longer appear are preserved in a "Resolved Previously" archive section with their final classification.

**Rationale**:
- Human triage is the most expensive input; preserving it across runs is critical for the audit to be a living artefact, not a single throwaway.
- Defaulting new findings to `fix-now` makes first-run triage explicit (you must actively downgrade to `accepted` or `deferred`).
- Archive section prevents silent loss of historical decisions.

**Alternatives considered**:
- **Store classifications in a separate YAML file**: Splits the human-edited state from the report; easier to drift.
- **Classifications embedded in JSON**: JSON editing is awkward; markdown is the authoring surface.
- **No preservation (regenerate from scratch)**: Every re-run is a fresh triage — unsustainable.

---

## R11. `axe_version` + `storybook_version` in front matter

**Decision**: Front matter records:
- `git_sha`: short HEAD at audit time (matches test-summary-template convention).
- `captured_at`: ISO-8601 UTC timestamp.
- `axe_version`: reported by `AxeBuilder` (`result.testEngine.version`).
- `storybook_version`: read from `shared/components/package.json` at audit time.

**Rationale**:
- Axe rule behaviour changes across versions; pinning the version in the report makes historical reports verifiable.
- Storybook version matters because theme decorator and iframe structure can shift with major bumps.

**Alternatives considered**:
- **Git SHA only**: Loses transparency for the reader; forces them to clone + check lockfile.
- **Full lockfile hash**: Too noisy; axe + storybook are the two versions that actually move the audit outcome.

---

## Summary — all NEEDS CLARIFICATION resolved

| Technical Context field | Resolved? | Source |
|-------------------------|-----------|--------|
| Language/Version | ✅ | TypeScript 5.x (TS-only feature) |
| Primary Dependencies | ✅ | R1 |
| Storage | ✅ | R4 |
| Testing | ✅ | R1 + R2 |
| Target Platform | ✅ | Existing `shared/components/playwright.config.ts` |
| Project Type | ✅ | Single package |
| Performance Goals | ✅ | SC-004 (5 min) + plan constraint |
| Constraints | ✅ | R2 + R7 (offline, gate-capable, no transient commits) |
| Scale/Scope | ✅ | R3 (dynamic discovery scales) |

No open questions remain. Proceed to Phase 1.
