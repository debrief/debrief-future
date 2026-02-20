# Research: Browser-Based VS Code Extension Preview

**Feature**: 099-browser-extension-preview
**Date**: 2026-02-19

## R1: code-server vs Open VSX Compatibility

**Decision**: Use code-server (coder/code-server) as the browser-based VS Code host.

**Rationale**:
- code-server is the de facto standard for running VS Code in the browser. It's MIT-licensed, actively maintained, and widely deployed.
- The Debrief extension installs via `.vsix` sideloading (`code-server --install-extension`), so marketplace compatibility (Open VSX vs VS Code Marketplace) is irrelevant — the extension is bundled directly.
- The extension's webview architecture (postMessage-based communication, IIFE bundles) is fully compatible with code-server's webview implementation.

**Alternatives Considered**:
- **Eclipse Theia**: More complex to configure, heavier image. Not needed since the extension doesn't require Theia-specific APIs.
- **VS Code for the Web (vscode.dev)**: Hosted by Microsoft, no self-hosting option. Cannot pre-install custom extensions from `.vsix`.
- **Gitpod/Codespaces**: Overkill — these are full development environments. We only need a read-only review environment.

## R2: `vscode.env.openExternal()` Compatibility

**Decision**: Guard the single call site with a feature check; fall back to displaying the URL as a clickable link in the panel.

**Rationale**:
- The only usage is in `apps/vscode/src/services/activityBarService.ts` (lines 61, 79), where it opens VS Code documentation links. This is a "nice to have" — reviewers don't need these help links to exercise the extension.
- code-server partially supports `vscode.env.openExternal()` (it opens in the same browser), so it may work without changes. The guard is a defensive measure.

**Alternatives Considered**:
- **Remove the calls entirely**: Too invasive; they serve a purpose in desktop VS Code.
- **Polyfill**: Unnecessary complexity for two informational links.

## R3: Heroku Container Deployment Model

**Decision**: Use Heroku's container stack (`heroku.yml` with `build.docker`) rather than buildpacks.

**Rationale**:
- Full control over the runtime environment. code-server has specific system dependencies (Node.js runtime, native modules) that don't fit standard buildpacks.
- The project already has Docker expertise (demo environment uses Docker extensively).
- Heroku container stack supports `$PORT` binding natively — code-server's `--bind-addr 0.0.0.0:$PORT` maps directly.
- `heroku.yml` is preferred over `Dockerfile` + `Procfile` for container deployments as it's the modern Heroku container approach.

**Alternatives Considered**:
- **Buildpacks**: Would require custom buildpack for code-server. More fragile, harder to debug.
- **Docker Compose on Heroku**: Not supported for Review Apps.

## R4: Container Image Strategy

**Decision**: Create a dedicated `preview/` directory at the repository root with its own Dockerfile, separate from the existing `demo/` environment.

**Rationale**:
- The `demo/` environment runs a full XFCE desktop via noVNC — this is a heavy (~1GB+) image designed for demonstrating the complete Debrief workflow including desktop integration.
- The preview environment only needs code-server + the extension + sample data. This is a much lighter image (~300-400MB) with faster startup.
- Separation prevents changes to the preview setup from affecting the existing demo, and vice versa.
- The `preview/Dockerfile` can be purpose-built for Heroku's constraints (single process, `$PORT` binding, no persistent storage).

**Alternatives Considered**:
- **Reuse `demo/Dockerfile`**: Too heavy (noVNC + XFCE + Python venv). Slow startup would fail SC-001 (under 2 minutes). Different deployment target (Fly.io vs Heroku).
- **Multi-stage build from demo**: Would create coupling between two different deployment targets. Maintenance burden outweighs shared code benefit.

## R5: Sample Data Strategy

**Decision**: Copy the existing test data from `apps/vscode/test-data/` into the preview container, supplemented by `demo/samples/example-track.rep`.

**Rationale**:
- `apps/vscode/test-data/` already contains a realistic STAC catalog structure (`local-store/exercise-alpha/`, `local-store/training-run-1/`) with GeoJSON items, plus multiple REP files (`boat1.rep`, `boat2.rep`, `shapes.rep`, `narrative.rep`). This exercises the full extension: STAC explorer tree, map view, file loading.
- `demo/samples/example-track.rep` provides an additional standalone REP file.
- No new sample data needs to be created.

**Alternatives Considered**:
- **Generate synthetic data**: Unnecessary — existing test data is sufficient and realistic.
- **Download from GitHub Release at startup**: Adds latency and network dependency. Conflicts with offline-by-default principle for the container build itself.

## R6: CI Pipeline Extension

**Decision**: Extend the existing `vscode-extension.yml` workflow to build the preview container image on PRs and push to Heroku Container Registry.

**Rationale**:
- The workflow already builds the `.vsix` on every PR (`pnpm run package`). The image build can be added as a subsequent step.
- Heroku Review Apps with container stack require pushing images to `registry.heroku.com/<app>/web`. This can be done via `heroku container:push` in CI.
- The CI job should only build the preview image when files in `apps/vscode/`, `shared/`, or `preview/` change (path filtering).

**Alternatives Considered**:
- **Separate workflow**: Would duplicate the `.vsix` build step. The extension workflow already handles the full build chain.
- **Build image on Heroku**: Heroku can build from `heroku.yml` directly. This is simpler and doesn't require CI to push images. The `heroku.yml` `build.docker` directive handles this automatically for Review Apps.

**Revised Decision**: Let Heroku build the Docker image from `heroku.yml` directly during Review App creation. No CI changes needed for the image build — only the existing `.vsix` packaging is required, which already happens.

## R7: Authentication for Preview Environment

**Decision**: Use code-server's built-in password authentication with a random password generated at container startup, displayed in the Heroku logs.

**Rationale**:
- Preview URLs are not secret (they appear in PR descriptions), so some authentication is needed to prevent drive-by access.
- code-server supports `--auth password` with `$PASSWORD` environment variable. Heroku allows setting config vars per-app.
- A simpler approach: set `--auth none` for Review Apps since they're ephemeral and tied to PRs. The Heroku Review App URL itself provides soft security (random subdomain, short-lived).

**Revised Decision**: Use `--auth none` for Review Apps. These are ephemeral, short-lived environments for trusted reviewers. The random Heroku URL provides adequate soft security. This removes friction from the review workflow (SC-001: under 2 minutes).

**Alternatives Considered**:
- **GitHub OAuth**: Complex setup, overkill for ephemeral review environments.
- **Password in PR description**: Adds friction. Reviewers would need to copy-paste a password.

## R8: Workspace Configuration

**Decision**: Create a `.code-workspace` file in the preview container that opens the sample data directory and the welcome document.

**Rationale**:
- code-server supports VS Code workspace files. Starting with `code-server --open <workspace-file>` opens the configured folders and files.
- The workspace file can specify `"folders"` (sample data directory) and `"settings"` (extension-specific defaults like default STAC catalog path).
- The welcome document (WELCOME.md) is set as the startup editor via code-server's `--welcome-page` or workspace `settings.json`.

**Alternatives Considered**:
- **Open directory directly**: No control over which files appear on startup. Reviewer would need to find sample data manually.
- **VS Code settings.json only**: Doesn't allow opening specific files on startup.
