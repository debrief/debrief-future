# Usage Example — Feature 099: Browser-Based VS Code Extension Preview

## Quick Start: Local Preview

### Step 1: Build the Extension Package

```bash
pnpm install
pnpm build
cd apps/vscode && npx vsce package --no-dependencies && cd ../..
```

This produces `apps/vscode/debrief-vscode-0.1.0.vsix`.

### Step 2: Build the Preview Container

```bash
docker build -t debrief-preview -f preview/Dockerfile .
```

Or using the Taskfile:
```bash
task preview:package
task preview:build
```

### Step 3: Run the Preview Container

```bash
docker run --rm -p 8080:8080 -e PORT=8080 debrief-preview
```

Or using the Taskfile:
```bash
task preview:run
```

### Step 4: Open in Browser

Navigate to `http://localhost:8080`. You should see:

1. **VS Code interface** powered by code-server
2. **Debrief extension** active in the activity bar (STAC Explorer, Tools, Log)
3. **WELCOME.md** open in the editor with review instructions
4. **Sample data** visible in the file explorer:
   - REP files: boat1.rep, boat2.rep, shapes.rep, narrative.rep, example-track.rep
   - STAC catalog: local-store/ with Exercise Alpha and Training Run 1

### Step 5: Exercise the Extension

1. Click the **Debrief** icon in the activity bar to open the STAC Explorer
2. Double-click **Exercise Alpha** to load the plot
3. The map view opens showing vessel tracks south of Plymouth
4. Open `boat1.rep` via right-click > **Debrief: Load File**
5. Use the time controller to scrub through the timeline
6. Check the **Log** panel for execution history

## Heroku Review App Flow (After Configuration)

### For PR Authors

1. Push changes to a PR branch
2. Heroku automatically builds and deploys a review app
3. The preview URL appears in the Heroku Dashboard and can be linked in the PR description

### For Reviewers

1. Open the PR on GitHub
2. Click the preview URL in the PR description
3. Wait for code-server to load (typically under 2 minutes)
4. Read the WELCOME.md for testing guidance
5. Exercise the extension features described in the PR
6. Return to GitHub to approve or request changes

### Automated Smoke Test

Run the Playwright smoke test against any preview instance:

```bash
CODE_SERVER_URL=http://localhost:8080 pnpm exec playwright test \
  --config=tests/e2e/playwright.config.ts test-preview-smoke
```

The test verifies:
- VS Code workbench renders
- Debrief activity bar icon is present
- Log activity panel is accessible
- File explorer shows sample workspace files
