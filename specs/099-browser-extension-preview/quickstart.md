# Quickstart: Browser-Based VS Code Extension Preview

**Feature**: 099-browser-extension-preview
**Date**: 2026-02-19

## Prerequisites

- Docker installed and running
- Node.js 20+ and pnpm (for building the `.vsix`)
- A web browser

## Phase 1: Local Testing (Before Heroku Config)

### Step 1: Build the VS Code Extension

From the repository root:

```bash
pnpm install
pnpm --filter debrief-vscode run build
pnpm --filter debrief-vscode run package
```

This produces `apps/vscode/debrief-vscode-*.vsix`.

### Step 2: Build the Preview Container

```bash
docker build -t debrief-preview -f Dockerfile.preview .
```

The Dockerfile copies the `.vsix` from the build context and installs it into code-server.

### Step 3: Run the Preview Container

```bash
docker run -p 8080:8080 -e PORT=8080 debrief-preview
```

### Step 4: Open in Browser

Navigate to `http://localhost:8080` in your web browser.

You should see:
- VS Code interface powered by code-server
- The Debrief extension active (check the sidebar for STAC Explorer, Tools, etc.)
- WELCOME.md open in the editor
- Sample data directory visible in the file explorer

### Step 5: Verify Extension Features

1. **STAC Explorer**: The sidebar should show the sample STAC catalogs
2. **Map View**: Open a `.geojson` file — the map panel should display tracks
3. **REP Files**: Open a `.rep` file — the extension should parse and display it
4. **Activity Panels**: Time controller, activity panel, and log panel should be accessible

## Phase 2: Heroku Review Apps (After Heroku Config)

### Manual Configuration Steps (for repo owner)

1. Log in to the Heroku Dashboard
2. Create a new Heroku pipeline (e.g., `debrief-preview`)
3. Connect the `debrief/debrief-future` GitHub repository
4. Under "Review Apps", enable "Create new review apps for new pull requests automatically"
5. Set the stack to "container" if not auto-detected from `heroku.yml`

### Validating the Review App

1. Open a PR that modifies files in `apps/vscode/` or `shared/`
2. Wait for Heroku to build and deploy the review app (2-5 minutes for first build)
3. Click the "View deployment" link on the PR or navigate to the Heroku-assigned URL
4. Verify the VS Code interface loads with the extension active
5. Close/merge the PR and confirm the review app is destroyed

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Container builds but code-server won't start | Port mismatch | Ensure `PORT` env var is set |
| Extension not visible in sidebar | `.vsix` not installed | Check Docker build logs for install step |
| Sample data missing | Dockerfile COPY path wrong | Verify `preview/workspace/samples/` exists in build context |
| Map view blank | Webview CSP issue | Check browser console for blocked resources |
| Heroku build fails | Dockerfile not found | Ensure `heroku.yml` points to `Dockerfile.preview` |
