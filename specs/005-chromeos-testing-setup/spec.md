# Feature Specification: Browser-Accessible Demo Environment

**Feature Branch**: `005-chromeos-testing-setup`
**Created**: 2026-01-13
**Status**: Draft
**Input**: Strategy discussion for enabling testing and stakeholder review from ChromeOS and other browser-only environments.

## Overview

This specification defines a browser-accessible demo environment for Debrief. The environment provides a full Linux desktop with file manager integration, accessible via any web browser. This enables testing from ChromeOS devices and stakeholder demonstrations without requiring local installation.

### Design Principles

1. **Separation of concerns**: The container image (infrastructure) changes rarely; the Debrief application (payload) is loaded dynamically at startup.
2. **CI does the heavy lifting**: All compilation, packaging, and environment setup happens in GitHub Actions. Container startup is minimal.
3. **Version flexibility**: Different demo instances can run different Debrief versions by changing an environment variable.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub CI                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. Build Debrief Python packages                                     │  │
│  │  2. Create virtual environment, install packages                      │  │
│  │  3. Bundle frontend applications (Electron loader, etc.)              │  │
│  │  4. Prepare desktop integration files (.desktop, MIME types)          │  │
│  │  5. Include sample data files                                         │  │
│  │  6. Package as debrief-demo.tar.gz                                    │  │
│  │  7. Upload to GitHub Releases                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GitHub Releases                                   │
│                                                                             │
│    debrief-demo-v0.1.0.tar.gz (versioned)                                   │
│    debrief-demo-latest.tar.gz (rolling)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Fly.io Container                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Base: linuxserver/webtop:ubuntu-xfce                                 │  │
│  │  + Python 3.11+ runtime                                               │  │
│  │  + Node.js runtime                                                    │  │
│  │  + Startup script (fetches artifact, configures desktop)              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│  Startup (~3-5 seconds):             │                                      │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │  curl $ARTIFACT_URL | tar xz -C /opt/debrief                          │  │
│  │  cp -r /opt/debrief/dot-local/* /config/.local/                       │  │
│  │  update-mime-database /config/.local/share/mime                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                         VNC + noVNC (port 6080)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        https://debrief-demo.fly.dev
                                      │
                                      ▼
                    Browser (ChromeOS, iPad, any device)
```

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access Demo from Browser (Priority: P1)

A developer or stakeholder opens a browser on any device (ChromeOS, iPad, laptop), navigates to the demo URL, and sees a functional Linux desktop with Debrief installed.

**Why this priority**: This is the core value proposition — browser access to a working demo environment.

**Independent Test**: Navigate to demo URL in browser, verify desktop loads and is interactive.

**Acceptance Scenarios**:

1. **Given** the demo container is running, **When** user navigates to `https://debrief-demo.fly.dev`, **Then** noVNC connection page is displayed.
2. **Given** noVNC connection page, **When** user clicks "Connect", **Then** XFCE desktop is displayed in browser.
3. **Given** desktop is displayed, **When** user interacts with mouse/keyboard, **Then** desktop responds normally (open menus, move windows, etc.).

---

### User Story 2 - Open Data File via File Manager (Priority: P1)

A user opens the file manager, navigates to sample data files, right-clicks a `.rep` file, and selects "Open in Debrief" from the context menu. The Debrief application launches with the file loaded.

**Why this priority**: Demonstrates the full file manager integration workflow that will be used in production.

**Independent Test**: Right-click sample .rep file, select "Open in Debrief", verify application launches with file.

**Acceptance Scenarios**:

1. **Given** desktop is running, **When** user opens file manager (Thunar), **Then** Documents folder with sample files is visible.
2. **Given** sample .rep files in Documents, **When** user right-clicks a .rep file, **Then** context menu includes "Open in Debrief" option.
3. **Given** right-click menu displayed, **When** user selects "Open in Debrief", **Then** Debrief application launches and loads the selected file.

---

### User Story 3 - Update Demo to New Version (Priority: P1)

A maintainer updates the demo to a new Debrief version without rebuilding the Docker image. They update an environment variable and restart the container.

**Why this priority**: Enables rapid iteration — code changes deploy in seconds, not minutes.

**Independent Test**: Change `DEBRIEF_VERSION` env var, restart container, verify new version is running.

**Acceptance Scenarios**:

1. **Given** demo running version v0.1.0, **When** maintainer sets `DEBRIEF_VERSION=v0.2.0` and restarts, **Then** container starts with v0.2.0.
2. **Given** container restart, **When** startup completes, **Then** total startup time is under 30 seconds.
3. **Given** new version deployed, **When** user connects, **Then** new version's features/fixes are present.

---

### User Story 4 - Cost-Efficient Standby Mode (Priority: P2)

When no one is using the demo, the container automatically stops to minimize costs. When a user navigates to the URL, the container automatically starts.

**Why this priority**: Reduces hosting costs for infrequently-used demo environment.

**Independent Test**: Leave demo idle for configured timeout, verify container stops. Navigate to URL, verify container starts.

**Acceptance Scenarios**:

1. **Given** no active connections, **When** idle timeout elapses (e.g., 30 minutes), **Then** Fly.io scales container to zero.
2. **Given** container is stopped, **When** user navigates to demo URL, **Then** Fly.io automatically starts container.
3. **Given** auto-start triggered, **When** container becomes ready, **Then** user sees desktop within 60 seconds of initial request.

---

### User Story 5 - Secure Access (Priority: P2)

Access to the demo is protected so only authorized users can connect. Basic authentication is required.

**Why this priority**: Prevents unauthorized access to demo environment.

**Independent Test**: Attempt to connect without credentials, verify access denied. Connect with valid credentials, verify access granted.

**Acceptance Scenarios**:

1. **Given** authentication configured, **When** user connects without password, **Then** connection is rejected.
2. **Given** valid VNC password, **When** user enters password on noVNC page, **Then** desktop access is granted.
3. **Given** multiple failed attempts, **When** threshold exceeded, **Then** connection is rate-limited.

---

### User Story 6 - CI Publishes New Artifact (Priority: P1)

When code is pushed to the main branch, CI automatically builds and publishes a new demo artifact to GitHub Releases.

**Why this priority**: Enables continuous deployment — push code, artifact is built, demo can be updated.

**Independent Test**: Push commit to main, verify new artifact appears in GitHub Releases.

**Acceptance Scenarios**:

1. **Given** push to main branch, **When** CI workflow completes, **Then** new `debrief-demo.tar.gz` is uploaded to Releases.
2. **Given** artifact uploaded, **When** tagged release is created, **Then** versioned artifact (e.g., `v0.2.0`) is available.
3. **Given** CI builds artifact, **When** artifact is downloaded and extracted, **Then** venv is functional without additional pip install.

---

### Edge Cases

- What happens when artifact download fails at startup? (Retry with backoff, then fail with clear error)
- What happens when artifact URL returns 404? (Startup fails, container shows error in logs)
- How does system handle multiple simultaneous users? (Single container, shared session — acceptable for demo)
- What happens when disk fills up? (Container restart clears ephemeral storage)
- How are secrets (VNC password) managed? (Fly.io secrets, not in code)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Linux desktop accessible via web browser.
- **FR-002**: System MUST use noVNC for browser-based VNC access.
- **FR-003**: System MUST download Debrief artifact from GitHub Releases at container startup.
- **FR-004**: System MUST support version selection via `DEBRIEF_VERSION` environment variable.
- **FR-005**: System MUST configure file manager (Thunar) right-click integration for Debrief file types.
- **FR-006**: System MUST register MIME types for Debrief file formats (`.rep`, etc.).
- **FR-007**: System MUST include sample data files for demonstration purposes.
- **FR-008**: System MUST support password authentication for VNC access.
- **FR-009**: CI MUST build portable Python virtual environment in artifact.
- **FR-010**: CI MUST build artifact on Ubuntu version matching container base image.
- **FR-011**: CI MUST upload artifact to GitHub Releases on successful build.
- **FR-012**: Container startup MUST complete in under 30 seconds (excluding artifact download).
- **FR-013**: System MUST support Fly.io auto-stop and auto-start for cost control.

### Non-Functional Requirements

- **NFR-001**: Base Docker image SHOULD change less than once per month.
- **NFR-002**: Artifact download time SHOULD be under 30 seconds on typical connections.
- **NFR-003**: Desktop SHOULD be responsive with latency under 100ms on good connections.
- **NFR-004**: Monthly hosting cost SHOULD be under $10 for intermittent use.

### Key Entities

- **Demo Artifact**: Tarball containing pre-built Debrief environment (venv, apps, desktop files, samples).
- **Base Image**: Docker image with Linux desktop, VNC, noVNC, and runtime dependencies.
- **Desktop Integration**: Freedesktop.org `.desktop` files and MIME type definitions for file associations.

## Technical Specifications

### Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Base image | `linuxserver/webtop:ubuntu-xfce` | Well-maintained, lightweight, includes VNC+noVNC |
| Desktop environment | XFCE | Lightweight, stable, good Thunar file manager |
| VNC server | TigerVNC (included in base) | Standard, reliable |
| Web access | noVNC (included in base) | No client install required |
| Hosting | Fly.io | Docker-native, auto-scaling, reasonable pricing |
| Artifact storage | GitHub Releases | Integrated with repo, public URLs, versioning |
| CI | GitHub Actions | Integrated with repo, free for public repos |
| Python runtime | 3.11+ | Match project requirements |
| Node.js runtime | 18+ LTS | For Electron/frontend apps |

### Artifact Structure

```
debrief-demo.tar.gz
├── venv/                           # Pre-installed Python virtual environment
│   ├── bin/
│   │   ├── python                  # Python interpreter
│   │   ├── debrief-*               # CLI entry points
│   │   └── activate                # Activation script
│   └── lib/python3.11/site-packages/
│       ├── debrief_io/
│       ├── debrief_config/
│       ├── debrief_calc/
│       └── ...
├── apps/                           # Frontend applications
│   └── loader/                     # Electron app (AppImage or unpacked)
├── dot-local/                      # Ready to copy to /config/.local/
│   └── share/
│       ├── applications/
│       │   └── debrief-open.desktop
│       └── mime/
│           └── packages/
│               └── debrief.xml
├── bin/                            # Entry point scripts
│   └── debrief-open                # Called by .desktop file
└── samples/                        # Sample data files
    ├── example-track.rep
    └── multi-vessel.rep
```

### Container File Layout

```
/opt/debrief/                       # Extracted artifact
├── venv/
├── apps/
├── bin/
└── samples/

/config/                            # User home (linuxserver convention)
├── .local/share/applications/      # Desktop files (copied from artifact)
├── .local/share/mime/packages/     # MIME types (copied from artifact)
└── Documents/                      # Sample files (copied from artifact)
    └── Debrief Samples/
```

### Desktop Integration Files

**debrief-open.desktop**:
```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=Open in Debrief
Comment=Open file in Debrief maritime analysis tool
Exec=/opt/debrief/bin/debrief-open %f
Icon=debrief
MimeType=application/x-debrief-rep;
Categories=Science;Geography;
```

**debrief.xml** (MIME type):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-debrief-rep">
    <comment>Debrief REP file</comment>
    <glob pattern="*.rep"/>
    <glob pattern="*.REP"/>
  </mime-type>
</mime-info>
```

### Fly.io Configuration

**fly.toml**:
```toml
app = "debrief-demo"
primary_region = "lhr"  # London, adjust as needed

[env]
  DEBRIEF_VERSION = "latest"
  # DEBRIEF_ARTIFACT_URL can override for custom builds

[http_service]
  internal_port = 3000  # noVNC port in linuxserver image
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024
```

### Startup Script

```bash
#!/bin/bash
# /etc/cont-init.d/99-debrief-setup

set -e

VERSION="${DEBRIEF_VERSION:-latest}"
BASE_URL="https://github.com/debrief/debrief-future/releases"

if [ "$VERSION" = "latest" ]; then
  URL="${DEBRIEF_ARTIFACT_URL:-$BASE_URL/latest/download/debrief-demo.tar.gz}"
else
  URL="${DEBRIEF_ARTIFACT_URL:-$BASE_URL/download/$VERSION/debrief-demo.tar.gz}"
fi

echo "Downloading Debrief artifact from: $URL"
mkdir -p /opt/debrief
curl -fsSL "$URL" | tar xz -C /opt/debrief

echo "Configuring desktop integration..."
cp -r /opt/debrief/dot-local/* /config/.local/
update-mime-database /config/.local/share/mime
update-desktop-database /config/.local/share/applications

echo "Copying sample files..."
mkdir -p "/config/Documents/Debrief Samples"
cp -r /opt/debrief/samples/* "/config/Documents/Debrief Samples/"

echo "Debrief setup complete."
```

### CI Workflow

```yaml
# .github/workflows/build-demo-artifact.yml
name: Build Demo Artifact

on:
  push:
    branches: [main]
    paths:
      - 'services/**'
      - 'apps/**'
      - 'demo/**'
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-22.04  # Match container base

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Build artifact
        run: |
          mkdir -p artifact/{venv,apps,dot-local,bin,samples}

          # Create and populate venv
          python -m venv --copies artifact/venv
          artifact/venv/bin/pip install --upgrade pip
          artifact/venv/bin/pip install ./services/*

          # Make venv relocatable
          sed -i 's|'$PWD'/artifact|/opt/debrief|g' artifact/venv/bin/*

          # Build frontend apps (when they exist)
          # cd apps/loader && npm ci && npm run build
          # cp -r dist artifact/apps/loader

          # Copy desktop integration
          cp -r demo/desktop/* artifact/dot-local/

          # Copy entry scripts
          cp demo/bin/* artifact/bin/
          chmod +x artifact/bin/*

          # Copy samples
          cp -r demo/samples/* artifact/samples/

          # Package
          tar czf debrief-demo.tar.gz -C artifact .

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: debrief-demo
          path: debrief-demo.tar.gz

      - name: Upload to release
        if: github.event_name == 'release'
        uses: softprops/action-gh-release@v1
        with:
          files: debrief-demo.tar.gz
```

## Debrief Component Integration *(Flexible)*

This section describes how Debrief components integrate with the demo environment. These details will evolve as components are developed.

### Expected Components

| Component | Status | Integration |
|-----------|--------|-------------|
| debrief-io | Planned | Python package in venv |
| debrief-config | Planned | Python package in venv |
| debrief-calc | Planned | Python package in venv |
| Loader app | Planned | Electron app in /opt/debrief/apps/ |
| VS Code extension | Planned | May require separate integration |

### Entry Point Script

The `debrief-open` script serves as the bridge between file manager and Debrief applications. Its implementation will depend on which components are available:

**Minimal (services only)**:
```bash
#!/bin/bash
# Invoke Python service to process file
/opt/debrief/venv/bin/python -m debrief_io.cli open "$1"
```

**With Loader app**:
```bash
#!/bin/bash
# Launch Electron app with file
/opt/debrief/apps/loader/debrief-loader "$1"
```

### File Type Associations

Additional file types can be added to `debrief.xml` as support is implemented:

| Extension | MIME Type | Component |
|-----------|-----------|-----------|
| `.rep` | `application/x-debrief-rep` | debrief-io |
| `.dsf` | `application/x-debrief-session` | Future |
| `.dpf` | `application/x-debrief-plot` | Future |

## Automated Testing Strategy

The demo environment requires automated tests to ensure it remains available and functional for stakeholders. Tests are organized in layers, from simple availability checks to end-to-end workflow validation.

### Test Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Layer 7: End-to-End Workflow                                               │
│  "Can open Debrief and load a file from STAC"                               │
│  Browser automation (Playwright) → noVNC → full user journey                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 6: Data Pipeline                                                     │
│  "Can load a REP file into a STAC"                                          │
│  Container exec → invoke debrief-io → verify STAC output                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 5: Desktop Integration                                               │
│  "Has correct desktop integration"                                          │
│  Container exec → check .desktop files, MIME database, file associations   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 4: Component Installation                                            │
│  "Has correct components installed"                                         │
│  Container exec → python imports, binary checks, version verification      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: VNC Connectivity                                                  │
│  "Able to be connected to"                                                  │
│  WebSocket connection to noVNC, authenticate, receive frame                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Service Running                                                   │
│  "Running"                                                                  │
│  Fly.io machine status, VNC process check, port listening                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: URL Availability                                                  │
│  "Available at URL"                                                         │
│  HTTP GET → 200 OK, SSL valid, response time                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: URL Availability

**Purpose**: Verify the demo URL is reachable and responding.

**Implementation**: Simple HTTP health check.

```bash
# Basic availability test
curl -sSf https://debrief-demo.fly.dev/ -o /dev/null -w '%{http_code}'
# Expected: 200
```

**CI Integration**:
```yaml
- name: Check URL availability
  run: |
    response=$(curl -sSf -o /dev/null -w '%{http_code}' https://debrief-demo.fly.dev/)
    if [ "$response" != "200" ]; then
      echo "Demo unavailable: HTTP $response"
      exit 1
    fi
```

**Monitoring**: Can use free uptime services (UptimeRobot, Freshping) for continuous monitoring with alerts.

---

### Layer 2: Service Running

**Purpose**: Verify the container is running and VNC service is active.

**Implementation**: Fly.io API + container health checks.

```bash
# Check machine status via Fly.io API
fly status --app debrief-demo --json | jq '.Machines[0].state'
# Expected: "started"

# Check VNC process inside container
fly ssh console --app debrief-demo --command "pgrep -x Xvnc"
# Expected: PID number
```

**Health Endpoint**: Add custom health check to container:

```bash
# /opt/debrief/bin/healthcheck.sh
#!/bin/bash
pgrep -x Xvnc > /dev/null || exit 1
pgrep -x Xfce4 > /dev/null || exit 1
exit 0
```

```toml
# fly.toml addition
[[services.http_checks]]
  path = "/healthz"  # Requires custom endpoint
  interval = 30000
  timeout = 5000
```

---

### Layer 3: VNC Connectivity

**Purpose**: Verify a client can actually connect to the desktop via noVNC.

**Implementation**: WebSocket connection test or headless VNC client.

```python
# tests/test_vnc_connectivity.py
import websocket
import ssl

def test_novnc_websocket_connection():
    """Verify WebSocket connection to noVNC succeeds."""
    url = "wss://debrief-demo.fly.dev/websockify"
    ws = websocket.create_connection(
        url,
        sslopt={"cert_reqs": ssl.CERT_REQUIRED}
    )
    # noVNC sends RFB protocol version on connect
    data = ws.recv()
    assert data.startswith(b"RFB "), f"Unexpected response: {data}"
    ws.close()
```

**Alternative**: Use `vncdo` for headless VNC testing:
```bash
# Connect and take screenshot
vncdo -s debrief-demo.fly.dev:5900 -p $VNC_PASSWORD capture screenshot.png
# Verify screenshot is not empty/black
```

---

### Layer 4: Component Installation

**Purpose**: Verify Debrief packages are installed and importable.

**Implementation**: Execute Python inside container.

```bash
# tests/test_components.sh (run via fly ssh)
fly ssh console --app debrief-demo --command "
  /opt/debrief/venv/bin/python -c '
import sys
errors = []

# Check Python packages
try:
    import debrief_io
    print(f\"debrief-io: {debrief_io.__version__}\")
except ImportError as e:
    errors.append(f\"debrief-io: {e}\")

try:
    import debrief_config
    print(f\"debrief-config: {debrief_config.__version__}\")
except ImportError as e:
    errors.append(f\"debrief-config: {e}\")

# Check binaries
import shutil
for binary in [\"debrief-open\"]:
    path = shutil.which(binary, path=\"/opt/debrief/bin\")
    if path:
        print(f\"{binary}: {path}\")
    else:
        errors.append(f\"{binary}: not found\")

if errors:
    print(\"ERRORS:\")
    for e in errors:
        print(f\"  - {e}\")
    sys.exit(1)
'
"
```

**Version Verification**:
```bash
# Verify expected version is installed
fly ssh console --app debrief-demo --command "
  cat /opt/debrief/VERSION
"
# Compare against expected $DEBRIEF_VERSION
```

---

### Layer 5: Desktop Integration

**Purpose**: Verify file manager integration is configured correctly.

**Implementation**: Check freedesktop.org files and MIME database.

```bash
# tests/test_desktop_integration.sh
fly ssh console --app debrief-demo --command "
  set -e

  # Check .desktop file exists and is valid
  desktop-file-validate /config/.local/share/applications/debrief-open.desktop
  echo '.desktop file: valid'

  # Check MIME type is registered
  grep -q 'application/x-debrief-rep' /config/.local/share/mime/packages/debrief.xml
  echo 'MIME type: registered'

  # Check file association
  xdg-mime query default application/x-debrief-rep | grep -q debrief
  echo 'File association: configured'

  # Check sample files exist
  ls /config/Documents/Debrief\\ Samples/*.rep > /dev/null
  echo 'Sample files: present'
"
```

---

### Layer 6: Data Pipeline

**Purpose**: Verify REP files can be parsed and loaded into STAC.

**Implementation**: Invoke debrief-io with sample file, verify STAC output.

```bash
# tests/test_data_pipeline.sh
fly ssh console --app debrief-demo --command "
  set -e

  # Create temp directory for test
  TEST_DIR=\$(mktemp -d)

  # Convert sample REP to STAC item
  /opt/debrief/venv/bin/python -m debrief_io.cli convert \\
    '/config/Documents/Debrief Samples/example-track.rep' \\
    --output \"\$TEST_DIR/output.geojson\"

  # Verify output is valid GeoJSON
  /opt/debrief/venv/bin/python -c '
import json
import sys
with open(sys.argv[1]) as f:
    data = json.load(f)
assert \"type\" in data, \"Missing type field\"
assert \"features\" in data or \"geometry\" in data, \"Not valid GeoJSON\"
print(\"GeoJSON output: valid\")
' \"\$TEST_DIR/output.geojson\"

  # Cleanup
  rm -rf \"\$TEST_DIR\"
"
```

---

### Layer 7: End-to-End Workflow

**Purpose**: Verify complete user journey through the GUI.

**Implementation**: Browser automation connecting to noVNC.

```typescript
// tests/e2e/demo-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Demo Environment E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to noVNC
    await page.goto('https://debrief-demo.fly.dev/');

    // Connect to VNC
    await page.click('button:has-text("Connect")');

    // Enter password if required
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill(process.env.VNC_PASSWORD!);
      await page.click('button:has-text("Submit")');
    }

    // Wait for desktop to load
    await expect(page.locator('canvas#noVNC_canvas')).toBeVisible();
    await page.waitForTimeout(3000); // Allow desktop to fully render
  });

  test('can open file manager and see sample files', async ({ page }) => {
    // Click file manager icon (coordinates depend on desktop layout)
    await page.click('canvas#noVNC_canvas', { position: { x: 50, y: 50 } });
    await page.waitForTimeout(2000);

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/file-manager.png' });

    // Visual regression or OCR verification would go here
  });

  test('can right-click REP file and see Debrief option', async ({ page }) => {
    // Navigate to Documents folder
    // Right-click on .rep file
    // Verify context menu contains "Open in Debrief"

    // This requires either:
    // 1. Visual comparison with expected screenshot
    // 2. OCR to read menu text
    // 3. Synthetic input recording/playback
  });

  test('can open Debrief and load file from STAC', async ({ page }) => {
    // Open Debrief application
    // Navigate to STAC catalog
    // Load a track
    // Verify map displays track

    // Screenshot comparison for verification
    await page.screenshot({ path: 'test-results/debrief-loaded.png' });
  });
});
```

**Challenges with Layer 7**:
- VNC is a canvas — no DOM to query
- Requires coordinate-based clicking or image recognition
- Tests are brittle if desktop layout changes
- Consider using `vncdotool` with image templates instead

**Alternative: VNC Screenshot Comparison**:
```python
# tests/e2e/test_visual.py
import vncdotool.client
from PIL import Image
import imagehash

def test_desktop_visual_state():
    """Compare desktop screenshot against known-good baseline."""
    client = vncdotool.client.VNCDoToolClient()
    client.connect('debrief-demo.fly.dev:5900')
    client.password(os.environ['VNC_PASSWORD'])

    # Capture current state
    client.captureScreen('current.png')

    # Compare with baseline
    current = Image.open('current.png')
    baseline = Image.open('baselines/desktop-ready.png')

    hash_current = imagehash.phash(current)
    hash_baseline = imagehash.phash(baseline)

    # Allow small differences (threshold of 5)
    assert hash_current - hash_baseline < 5, "Desktop appearance changed unexpectedly"
```

---

### Test Execution Strategy

| Test Layer | When to Run | Duration | Automation |
|------------|-------------|----------|------------|
| Layer 1: URL Availability | Every 5 min | <1s | UptimeRobot / cron |
| Layer 2: Service Running | On deploy, hourly | ~5s | GitHub Actions scheduled |
| Layer 3: VNC Connectivity | On deploy, hourly | ~10s | GitHub Actions scheduled |
| Layer 4: Components | On deploy | ~30s | GitHub Actions post-deploy |
| Layer 5: Desktop Integration | On deploy | ~30s | GitHub Actions post-deploy |
| Layer 6: Data Pipeline | On deploy, daily | ~60s | GitHub Actions scheduled |
| Layer 7: E2E Workflow | On deploy, weekly | ~5min | GitHub Actions scheduled |

### CI Workflow for Tests

```yaml
# .github/workflows/test-demo.yml
name: Test Demo Environment

on:
  workflow_dispatch:  # Manual trigger
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_run:
    workflows: ["Deploy Demo"]
    types: [completed]

jobs:
  test-layers-1-3:
    name: Availability & Connectivity
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Layer 1 - URL Availability
        run: |
          status=$(curl -sSf -o /dev/null -w '%{http_code}' https://debrief-demo.fly.dev/)
          echo "HTTP Status: $status"
          [ "$status" = "200" ]

      - name: Layer 2 - Service Running
        run: |
          fly status --app debrief-demo
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Layer 3 - VNC Connectivity
        run: |
          pip install websocket-client
          python tests/test_vnc_connect.py

  test-layers-4-6:
    name: Components & Integration
    runs-on: ubuntu-latest
    needs: test-layers-1-3
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Layer 4 - Components Installed
        run: fly ssh console --app debrief-demo --command "/opt/debrief/bin/test-components.sh"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Layer 5 - Desktop Integration
        run: fly ssh console --app debrief-demo --command "/opt/debrief/bin/test-desktop.sh"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Layer 6 - Data Pipeline
        run: fly ssh console --app debrief-demo --command "/opt/debrief/bin/test-pipeline.sh"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  test-layer-7:
    name: E2E Workflow
    runs-on: ubuntu-latest
    needs: test-layers-4-6
    if: github.event_name != 'schedule' || github.event.schedule == '0 0 * * 0'  # Weekly only
    steps:
      - uses: actions/checkout@v4

      - name: Setup Playwright
        run: npx playwright install --with-deps chromium

      - name: Layer 7 - E2E Tests
        run: npx playwright test tests/e2e/
        env:
          VNC_PASSWORD: ${{ secrets.VNC_PASSWORD }}

      - name: Upload Screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-screenshots
          path: test-results/
```

### Status Dashboard (Optional)

For visibility into demo health, consider a simple status page:

```markdown
# Demo Status

| Check | Status | Last Run |
|-------|--------|----------|
| URL Available | ✅ | 2 min ago |
| VNC Running | ✅ | 2 min ago |
| Components | ✅ | 6 hours ago |
| Desktop Integration | ✅ | 6 hours ago |
| Data Pipeline | ✅ | 6 hours ago |
| E2E Workflow | ✅ | 3 days ago |
```

This could be auto-generated by CI and published to GitHub Pages or a gist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can access Linux desktop from Chrome browser on ChromeOS within 60 seconds of navigating to URL.
- **SC-002**: Right-click on sample .rep file shows "Open in Debrief" option and launches application when clicked.
- **SC-003**: Changing `DEBRIEF_VERSION` and restarting container results in different version running within 60 seconds.
- **SC-004**: Container startup (after artifact download) completes in under 30 seconds.
- **SC-005**: CI workflow successfully builds and uploads artifact on push to main.
- **SC-006**: Artifact includes functional Python venv that works without additional pip install.
- **SC-007**: Monthly Fly.io cost stays under $10 with typical intermittent usage pattern.
- **SC-008**: Base Docker image requires rebuild less than once per month.
- **SC-009**: Automated tests for layers 1-6 run on every deploy and pass.
- **SC-010**: Layer 7 E2E tests run weekly and provide screenshot evidence.
- **SC-011**: Test failures trigger notifications (GitHub Actions, email, or Slack).
- **SC-012**: Stakeholders can view demo health status before attempting to connect.

### Definition of Done

1. Dockerfile and fly.toml committed and tested
2. CI workflow builds and uploads artifact on push
3. Demo accessible at `https://debrief-demo.fly.dev`
4. Sample files present and openable via right-click menu
5. Documentation for updating demo version
6. VNC password configured via Fly.io secrets
7. Automated test suite (layers 1-6) passing on deploy
8. Test workflow configured with scheduled runs
9. Status visibility mechanism in place (CI badges, status page, or notifications)
