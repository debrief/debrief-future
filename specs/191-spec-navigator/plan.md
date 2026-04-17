# Implementation Plan: Spec Navigator & Review Tool

**Branch**: `191-spec-navigator` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/191-spec-navigator/spec.md`

## Summary

A static, browser-hosted SPA that lets a reviewer open a pull request by number, read every artefact in that feature's `specs/NNN-*/` folder with faithful rendering (markdown + GFM, structured-data syntax highlight, inline images), capture comments at selection / document / feature granularity, and submit the whole batch as a single structured PR comment that the repo's existing automated PR watcher can parse and action. State lives in the browser (React state + `localStorage`); the GitHub PAT the reviewer pastes in never leaves their device. The tool is published to GitHub Pages from the same repo and linked automatically into new PRs by the existing `speckit.pr` command.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18.x
**Primary Dependencies**:
- Build: Vite 5.x (matches `apps/nl-demo` / `apps/web-shell` conventions)
- Rendering: `react-markdown` + `remark-gfm` (tables, task-lists), `rehype-slug` + `rehype-autolink-headings` (anchors), `rehype-highlight` + `highlight.js` (syntax highlighting — chosen over shiki to stay inside the mobile bundle budget; see `research.md` §1)
- Styling: plain CSS with custom properties (matches `apps/web-shell/src/App.css` pattern — no new CSS framework)
- State: vanilla React hooks + `localStorage`. No Zustand/Redux for v1 (scope is small; a single reducer suffices)
- Validation: `zod ^3.22.0` (matches the version already used in `shared/config-ts` and `services/session-state`) for narrow-at-boundary parsing of GitHub REST responses and for AJV-free validation of the outbound payload against the JSON Schema
- Testing: Vitest (unit + `vitest bench` for the render benchmark) + Playwright (E2E, reusing the repo's `@sparticuz/chromium` wrapper from `apps/web-shell/run-playwright.mjs`) + `@axe-core/playwright` for automated accessibility checks
**Storage**: Browser `localStorage` only. One key per feature scope (`spec-navigator:drafts:<pr-num>`). Credential in a single distinct key (`spec-navigator:github-pat`). No IndexedDB (overkill for the payload sizes involved — see `research.md`).
**Testing**: `vitest run` (unit) + one Playwright E2E against a seeded PR fixture (contract-level: submission payload matches the published JSON Schema)
**Target Platform**: Evergreen browsers (Chromium ≥ 121, Firefox ≥ 122, Safari ≥ 17) on desktop and mobile. No IE, no legacy Edge. Published at `https://debrief.github.io/debrief-future/spec-navigator/` (sub-path of the existing gh-pages site).
**Project Type**: Single SPA under `apps/spec-navigator/`. No backend. Follows repo's existing `apps/*` pnpm-workspace convention.
**Performance Goals**: First meaningful paint < 2s on broadband; spec artefact list resolved within 3s of page load; rendering a 200 KB markdown artefact < 500 ms (asserted by a `vitest bench` fixture over three real spec sizes — 50 KB / 150 KB / 300 KB); selection → comment composer opens within 100 ms of the user's click. Mobile: all of the above on a recent phone (iPhone 14 / Pixel 7 class).
**Bundle budget**: gzipped main chunk of `dist/` MUST NOT exceed **400 KB**. Enforced by a post-build vitest that reads `dist/` after `vite build` and fails CI if the budget is exceeded.
**Constraints**:
- Offline-tolerant drafting: once artefacts are fetched, comment creation / editing / persistence MUST work with no network. Only Submit requires the network.
- Credential containment enforced by CSP: `index.html` ships a `<meta http-equiv="Content-Security-Policy">` tag with `default-src 'self'; connect-src 'self' https://api.github.com https://raw.githubusercontent.com; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com data:; base-uri 'self'; form-action 'none'`. The PAT therefore cannot be exfiltrated to any other origin, even if a transitive dependency is compromised. CSP presence and `connect-src` contents are asserted by a vitest that reads the built `dist/index.html`.
- Zero backend: no server, no proxy, no serverless function. The app and its static assets are the entire deployment artefact.
- Strict type safety (Article XV): no `any`. Untyped GitHub REST payloads MUST be narrowed at the fetch boundary via `zod` parsers before reaching application code.
- Render memoisation: `ArtifactView` MUST be wrapped in `React.memo` with stable-reference props (artefact path + content hash). `CommentComposer` MUST live in a sibling subtree so its input-state mutations do not re-render the rendered markdown. This is design-time discipline, not a retrofit.
**Scale/Scope**:
- One SPA, ~8–10 React components, ~2k–4k LoC including tests.
- Target feature sizes: 10–30 artefacts per feature, 150–300 KB total markdown.
- Draft-comment payloads: 5–30 comments per submission typical; 100 comments tolerated without UI lag.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| I. Defence-Grade Reliability | ✅ with caveat | This is contributor tooling, not core runtime. Drafting is fully offline-tolerant per FR-019 / spec edge case. Submission requires network by design (it posts to GitHub); documented as an explicit non-goal rather than hidden. See Complexity Tracking. |
| II. Schema Integrity | ✅ | The submitted `spec-review-feedback-v1` payload is defined as an explicit JSON Schema under `specs/191-spec-navigator/contracts/spec-review-feedback-v1.schema.json` and the emitter is round-trip tested. Not LinkML-sourced: this is transport between a dev tool and a PR-watcher prompt, not part of the master data model. See Complexity Tracking for the LinkML-exemption rationale. |
| III. Data Sovereignty | ✅ | Drafts stored only on device; PAT stored only on device; every outbound request goes directly to GitHub; no telemetry / analytics / error reporting wired in. |
| IV. Architectural Boundaries | ✅ | Frontend only; no Python service to touch. Consumes GitHub API directly; no UI logic leaks into services because there are no services. |
| V. Extensibility | N/A | No extension surface. |
| VI. Testing | ✅ | Vitest unit tests for the reducer, the feedback-comment renderer, and the selection-anchor hash. Playwright E2E for the submit happy path. CI green gate. |
| VII. Test-Driven AI Collaboration | ✅ | Acceptance scenarios in spec.md are the definition of done; the JSON Schema for the payload is the verifiable contract. |
| VIII. Documentation | ✅ | This plan; `apps/spec-navigator/README.md`; quickstart; PAT-scope docs on-screen and in README. |
| IX. Dependencies | ✅ | Justified set: Vite (repo convention), react-markdown / remark-gfm (GFM), rehype-highlight + highlight.js (syntax highlighting, chosen over shiki to fit the 400 KB bundle budget), rehype-slug / rehype-autolink-headings (heading anchors), zod ^3.22.0 (version-matched with `shared/config-ts` / `services/session-state`; used for both GitHub-REST boundary parsing and outbound-payload validation against the JSON Schema). No UI framework (no Tailwind, no MUI). See `research.md` §§1, 10. |
| X. Security | ✅ | PAT never committed; stored only in `localStorage`; README documents fine-grained-PAT scope; clear action to wipe the stored credential; no CDN-hosted fonts or scripts that could exfiltrate. The containment promise is enforced by a CSP `<meta>` tag on `index.html` (see Technical Context → Constraints) so a compromised transitive dep cannot exfiltrate the PAT; CSP presence is asserted in CI by a dedicated test. An adversarial XSS fixture (10 standard payloads) runs against the markdown renderer on every dep bump. |
| XI. Internationalisation | ✅ with caveat | User-facing strings centralised in a `strings.ts` module from day one, so future translation is mechanical. Ship v1 in English only — this is a contributor tool, not an end-user feature, and the constitution's NATO-interop motivation targets end-user surfaces. Flagged here, not deferred silently. |
| XII. Community Engagement | ✅ | Entire purpose is to open spec review to reviewers without a local checkout. |
| XIII. Contribution Standards | ✅ | PR review + CI required. |
| XIV. Pre-Release Freedom | ✅ | Applicable — we are pre-v4.0.0. |
| XV. Strict Type Safety | ✅ | `tsc --strict`, no `any`, GitHub REST payloads narrowed via `zod` at the boundary. Generated-code rule N/A (no schema-generated types introduced by this feature beyond the hand-written JSON Schema; if `json-schema-to-typescript` is added later it must produce zero `any`). |

**Verdict**: PASS. Two documented caveats recorded under Complexity Tracking; no unjustified violations.

## Project Structure

### Documentation (this feature)

```text
specs/191-spec-navigator/
├── plan.md                                     # This file
├── research.md                                 # Phase 0 output
├── data-model.md                               # Phase 1 output
├── quickstart.md                               # Phase 1 output
├── contracts/
│   ├── spec-review-feedback-v1.schema.json    # Submitted PR-comment payload
│   ├── github-rest-narrow.md                  # GitHub REST response subsets we rely on
│   └── pr-comment-body.example.md             # Golden example of a rendered submission
├── checklists/
│   └── requirements.md                         # Already created by /speckit.specify
└── tasks.md                                    # Produced later by /speckit.tasks
```

### Source Code (repository root)

```text
apps/spec-navigator/                            # NEW — Vite + React 18 + TS SPA
├── package.json                                # Workspace member @debrief/spec-navigator
├── vite.config.ts                              # Base path: /debrief-future/spec-navigator/
├── tsconfig.json                               # strict: true, extends repo base
├── index.html                                  # Single entry; carries CSP meta tag
├── README.md                                   # PAT setup + local dev
├── public/                                     # Static assets (icons, favicon)
├── src/
│   ├── main.tsx                                # App mount
│   ├── App.tsx                                 # Layout shell (two-pane + drawer + settings)
│   ├── strings.ts                              # All user-facing strings (i18n-ready)
│   ├── components/
│   │   ├── ArtifactTree.tsx                    # Left pane
│   │   ├── ArtifactView.tsx                    # Right pane + raw/rendered toggle; memoised
│   │   │                                       #   (React.memo with stable-reference props)
│   │   ├── MarkdownView.tsx                    # react-markdown + remark-gfm + rehype-highlight
│   │   ├── CodeView.tsx                        # highlight.js wrapper for JSON/YAML/etc.
│   │   ├── ImageView.tsx                       # evidence images (Blob → object URL)
│   │   ├── SelectionAnchor.tsx                 # Floating "Add comment" affordance
│   │   ├── CommentComposer.tsx                 # Inline composer (all 3 levels); sibling subtree
│   │   ├── CommentDrawer.tsx                   # Right-edge drawer
│   │   ├── SubmitButton.tsx                    # Single-flight + SHA-recheck + stale-head modal
│   │   ├── StaleHeadModal.tsx                  # Shown when head.sha moved between load & submit
│   │   ├── SettingsPanel.tsx                   # PAT entry + scope docs + clear
│   │   └── ErrorBanner.tsx                     # Consistent error surface
│   ├── github/
│   │   ├── api.ts                              # Typed REST wrappers
│   │   ├── schemas.ts                          # zod parsers for REST responses
│   │   └── auth.ts                             # PAT get/set/clear + validity check
│   ├── state/
│   │   ├── commentsReducer.ts                  # Pure reducer — unit tested
│   │   ├── useComments.ts                      # Hook wrapping reducer + persistence
│   │   ├── useFeature.ts                       # Resolves PR → feature-folder → artefacts
│   │   └── persistence.ts                      # localStorage adapter (keys + versioning)
│   ├── format/
│   │   ├── renderFeedbackComment.ts            # Payload → markdown (machine + human)
│   │   ├── selectionAnchor.ts                  # Snippet + context + anchor format (\x1F)
│   │   └── __tests__/                          # Vitest: golden markdown, anchor roundtrip,
│   │                                           #   XSS adversarial, CSP presence, render bench
│   └── styles/
│       ├── tokens.css                          # Custom-property theme
│       └── app.css                             # Layout + components
├── e2e/
│   ├── submit.spec.ts                          # Playwright: happy path via mock GH server
│   ├── stale-head.spec.ts                      # Playwright: force-push mid-session (3A/3B)
│   ├── render.spec.ts                          # Playwright: traverse every artefact kind (9A)
│   └── a11y.spec.ts                            # Playwright + @axe-core/playwright
└── run-playwright.mjs                          # Thin wrapper reusing @sparticuz/chromium

.github/workflows/
└── spec-navigator-publish.yml                  # NEW — mirrors storybook.yml: peaceiris action,
                                                #   destination_dir: spec-navigator, keep_files: true

.github/workflows/ci.yml                        # TOUCHED — add @debrief/spec-navigator to the
                                                #   lint / typecheck / test matrix (closes 2A)

CLAUDE.md                                       # TOUCHED — add spec-navigator entry under
                                                #   Active Technologies AND a `pnpm --filter
                                                #   @debrief/spec-navigator ...` line to the
                                                #   "Before Pushing" fallback commands

.claude/commands/
├── speckit.pr.md                               # TOUCHED — append navigator link to PR body
└── speckit.apply-feedback.md                   # NEW — parses the fenced-block payload from a
                                                #   PR comment and walks the contained comments

pnpm-workspace.yaml                             # Auto-picked via apps/*; no manual edit
```

**Structure Decision**: New app under `apps/spec-navigator/`, matching the existing `apps/nl-demo/` and `apps/web-shell/` shape (Vite + React + plain CSS). It is a sibling app, not a package under `shared/components/`, because it is a deployable end-product rather than a reusable library. No schema generation, no Python code, no new services — the directory is self-contained.

## Media Components

None — this feature is a standalone deployable app, not a reusable component in the shared component library. There are no `*.stories.tsx` to bundle into a blog post. The blog post / LinkedIn content for this feature will instead embed a short screen-capture GIF of the review loop (captured during Phase 2 evidence, not a Storybook bundle).

## Storybook E2E Testing

None — no Storybook stories are authored by this feature. Internal components live inside the `apps/spec-navigator/` app, not in `shared/components/`, and are exercised by the app's own Playwright test (`apps/spec-navigator/e2e/submit.spec.ts`) rather than by the shared Storybook E2E suite.

## VS Code Webview E2E Testing

None — this feature does not touch `apps/vscode/` or any extension workflow.

## Complexity Tracking

Two caveats surfaced in the Constitution Check — recorded here, not hidden.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Feature requires network at submit time (Article I "Offline by default") | The entire purpose of Submit is to post to `api.github.com`. A review that never reaches the PR has no value. The *review* itself is offline-capable (drafting, editing, persistence) per FR-019; only the final handoff needs network. | A fully offline flow would require exporting the feedback to a file and re-uploading by hand — reintroducing exactly the friction this tool exists to remove. This feature is contributor tooling, not user-facing runtime: Article I's "core functionality" motivation does not apply. |
| Payload contract defined as hand-written JSON Schema rather than derived from LinkML (Article II "Single source of truth") | The submitted payload is a transport format between a dev tool and a prompt-consuming PR watcher. It is not part of the user-facing maritime data model governed by the master schema. Running it through LinkML generation would add a code-gen step for a ~15-field schema with no reuse across services. | LinkML authoring + pydantic generation + TS generation for a single-consumer, single-emitter transport format is disproportionate effort for no interoperability benefit. If the schema ever needs to be consumed from Python or matched against other internal schemas, it can be migrated to LinkML at that point with a version bump (`spec-review-feedback-v2`). |
