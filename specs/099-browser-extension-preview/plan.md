# Implementation Plan: Browser-Based VS Code Extension Preview

**Branch**: `099-browser-extension-preview` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/099-browser-extension-preview/spec.md`

## Summary

Enable browser-based review of the Debrief VS Code extension via Heroku Review Apps running code-server. A dedicated `preview/` directory contains a lightweight Docker image with code-server, the pre-built `.vsix` extension, and sample STAC/REP data. Heroku's container stack builds and deploys this image automatically for each PR. The work splits into two phases: Phase 1 prepares all artifacts and validates locally; Phase 2 (after manual Heroku configuration) validates the end-to-end PR preview workflow.

## Technical Context

**Language/Version**: Dockerfile (container definition), Bash (entry scripts), YAML (Heroku config, CI workflow)
**Primary Dependencies**: code-server (latest stable), existing `@vscode/vsce` for `.vsix` packaging
**Storage**: Ephemeral container filesystem (no persistence needed — preview environments are disposable)
**Testing**: Local Docker build + run, Playwright smoke test (extension activation + activity panels), CI smoke test
**Target Platform**: Heroku container stack (Linux, `$PORT` binding, single dyno)
**Project Type**: Infrastructure / DevOps (no application code changes)
**Performance Goals**: Container startup to interactive VS Code in under 2 minutes
**Constraints**: Heroku free/hobby dynos have 512MB RAM; code-server needs ~200-300MB. Image should be under 500MB.
**Scale/Scope**: One ephemeral container per open PR. Typically 1-3 concurrent review apps.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | **PASS** | Preview is an online-only development tool. Core functionality is unaffected. No cloud dependency added to the extension itself. |
| II. Schema Integrity | Schema tests mandatory | **N/A** | No schema changes. |
| III. Data Sovereignty | Provenance always | **N/A** | Preview uses existing sample data. No new data transformations. |
| IV. Architectural Boundaries | Services never touch UI | **PASS** | No service or UI code changes. This is infrastructure only. |
| V. Extensibility | No vendor lock-in | **PASS** | Heroku is the review app host but the container is standard Docker — portable to any container host. code-server is MIT-licensed OSS. |
| VI. Testing | CI MUST pass | **PASS** | Existing CI pipeline unchanged. Preview container build is additive. |
| VII. Test-Driven AI | Tests before implementation | **PASS** | Local Docker build + browser verification serves as the acceptance test. |
| VIII. Documentation | Specs before code | **PASS** | Spec written and approved before planning. |
| IX. Dependencies | Minimal, vetted | **PASS** | code-server is the only new dependency. It's MIT-licensed, 70k+ GitHub stars, maintained by Coder Inc. |
| X. Security | No secrets in code | **PASS** | No secrets committed. Heroku API key lives in Heroku Dashboard config only. Preview uses `--auth none` (ephemeral, short-lived). |
| XII. Community Engagement | Beta previews | **PASS** | This feature directly enables community review of in-progress work. |
| XIII. Contribution Standards | PR review required | **PASS** | This feature facilitates PR review by making it browser-accessible. |
| XIV. Pre-Release Freedom | Breaking changes permitted | **N/A** | No breaking changes. Additive infrastructure only. |

**Post-Phase 1 re-check**: All gates still pass. No design decisions introduced new violations.

## Project Structure

### Documentation (this feature)

```text
specs/099-browser-extension-preview/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 entity/config model
├── quickstart.md        # Phase 1 local testing guide
├── contracts/           # Phase 1 Heroku deployment contracts
│   └── heroku.yml       # Heroku container stack definition
├── media/
│   ├── planning-post.md # Blog post draft
│   └── linkedin-planning.md # LinkedIn summary
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
preview/
├── Dockerfile                  # code-server + extension container
├── entrypoint.sh               # Startup script (install .vsix, configure workspace)
├── workspace/
│   ├── debrief-preview.code-workspace  # VS Code workspace file
│   ├── WELCOME.md              # Reviewer onboarding document
│   └── samples/                # Symlinked or copied sample data
│       ├── exercise-alpha/     # STAC catalog (from test-data)
│       ├── training-run-1/     # STAC catalog (from test-data)
│       ├── boat1.rep
│       ├── boat2.rep
│       ├── shapes.rep
│       ├── narrative.rep
│       └── example-track.rep
heroku.yml                      # Heroku container stack definition (repo root)
app.json                        # Heroku Review Apps descriptor (repo root)
tests/e2e/
└── test-preview-smoke.spec.ts  # Playwright smoke test for preview container
.github/
└── PULL_REQUEST_TEMPLATE.md    # Updated with preview section (Phase 2)
```

**Structure Decision**: A dedicated `preview/` directory at the repo root keeps preview infrastructure separate from the existing `demo/` (Fly.io) environment. The `heroku.yml` and `app.json` must live at the repo root per Heroku requirements.

## Media Components

None — backend/infrastructure feature. No visual components, no Storybook stories.

## Storybook E2E Testing

No new Storybook stories — this feature creates infrastructure, not UI components.

However, the preview container **is** a browser-accessible environment that can be verified with Playwright. The project already has code-server E2E infrastructure in `tests/e2e/` with:

- `global-setup.ts` — starts code-server (or connects to `CODE_SERVER_URL`)
- `global-teardown.ts` — cleans up server process
- `fixtures/base.ts` — provides `CodeServerPage` fixture
- `models/code-server-page.ts` — page object for VS Code chrome interactions

### Preview Smoke Test

A Playwright test against the running preview container verifies:

1. code-server loads and the VS Code workbench renders
2. The **Debrief** activity bar icon is present (extension activated)
3. The **Log** activity panel is accessible
4. The file explorer shows the sample workspace

This test serves two purposes:
- **Feature verification**: Proves this feature (099) works end-to-end
- **Ongoing regression**: Runs against every future preview deployment to catch extension breakage

| Test | File | What It Checks |
|------|------|----------------|
| Preview smoke | `tests/e2e/test-preview-smoke.spec.ts` | Workbench loads, Debrief + Log panels present, sample data visible |

**Test runs against**: `CODE_SERVER_URL` (the preview container on `localhost:8080` or Heroku URL)

> **Playwright in cloud sessions**: The project uses `@sparticuz/chromium` for bundled Chromium in environments where browser CDN downloads are blocked. See `docs/project_notes/playwright-installation-research.md` for full details. Do NOT skip Playwright tests — they work in cloud sessions.

## Complexity Tracking

No constitution violations requiring justification.
