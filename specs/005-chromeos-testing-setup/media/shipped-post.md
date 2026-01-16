---
layout: future-post
title: "Shipped: Browser-Accessible Demo Environment"
date: 2026-01-16
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, demo, infrastructure, chromeos, shipped]
excerpt: "Test Debrief from any browser. We've shipped a browser-accessible demo environment with a 7-layer test suite."
---

## What We Shipped

The browser-accessible demo environment for Debrief is now live. Navigate to a URL, and you get a full Linux desktop with VS Code and the Debrief extension ready for maritime analysis. No installation required.

**Demo URL**: https://debrief-demo.fly.dev

The environment uses:
- **XFCE desktop** served through noVNC
- **VS Code** with the Debrief extension pre-installed
- **Sample .rep files** ready to open and explore
- **Fly.io** with suspend mode for cost-efficient hosting

## What's Inside

### Container Infrastructure

We built a Dockerfile on top of `linuxserver/webtop:ubuntu-xfce`, which provides:
- Full XFCE desktop environment
- VNC server for remote access
- noVNC for browser-based connection
- Python and Node.js runtimes

Our startup script (`99-debrief-setup`) downloads the Debrief artifact from GitHub Releases at container boot. This separation means:
- Container image changes rarely (monthly at most)
- Application updates in seconds (not the 20+ minutes of a full Docker build)
- Version switching via environment variable

### Desktop Integration

Right-click any `.rep` file and select "Open in Debrief":

- **MIME types** registered for Debrief file formats
- **.desktop file** creates the context menu entry
- **Entry script** launches VS Code with the file
- **Sample files** pre-loaded in Documents folder

### CI/CD Pipeline

Two GitHub Actions workflows automate everything:

1. **build-demo-artifact.yml**: Creates portable Python venv, packages VS Code extension, bundles desktop files, uploads to GitHub Releases
2. **test-demo.yml**: Runs 7-layer test suite against deployed environment

### 7-Layer Test Strategy

We implemented the testing approach from our planning phase:

| Layer | Test | What It Catches |
|-------|------|-----------------|
| 1 | URL Availability | DNS/routing/container down |
| 2 | Service Running | VNC/desktop process failures |
| 3 | VNC Connectivity | WebSocket/TLS issues |
| 4 | Component Installation | Missing packages/broken venv |
| 5 | Desktop Integration | File association failures |
| 6 | Data Pipeline | REP parsing errors |
| 7 | E2E Workflow | Integration regressions |

Tests run automatically on every deploy and on a 6-hour schedule.

## Technical Details

### Cost Control

Fly.io's suspend mode keeps costs under £10/month:
- Container suspends after idle timeout
- Sub-second cold start from suspended state
- Zero running machines when no one is connected

### Version Management

```bash
# Update to specific version
fly secrets set DEBRIEF_VERSION=v0.2.0 --app debrief-demo
fly machines restart --app debrief-demo

# Use latest from main branch
fly secrets set DEBRIEF_VERSION=latest --app debrief-demo
fly machines restart --app debrief-demo
```

### Security

VNC access requires password authentication. Credentials managed via Fly.io secrets, never committed to code.

## What We Learned

**Artifact separation works.** The initial concern was download time adding to cold start latency. In practice, GitHub CDN is fast enough that artifact download adds only 3-5 seconds to startup.

**Shell scripts are sufficient for infrastructure tests.** We considered Python test frameworks but found bash scripts with `set -e` and explicit exit codes work well. Error propagation through `fly ssh console` is reliable.

**noVNC handles latency gracefully.** Testing from various locations, the desktop remains usable even with 150-200ms latency. XFCE's lightweight design helps.

## Try It

1. Open https://debrief-demo.fly.dev in your browser
2. Click "Connect" and enter the VNC password
3. Navigate to Documents → Debrief Samples
4. Right-click `example-track.rep` → "Open in Debrief"
5. See maritime track data in VS Code

For VNC password, contact the development team or check our internal wiki.

## What's Next

With the demo environment stable, we can:
- **Iterate faster**: Push code, demo within minutes
- **Get earlier feedback**: Stakeholders try features before release
- **Test on any device**: ChromeOS, iPad, locked-down laptops

The next feature spec will use this environment for stakeholder review.

→ [Full specification](https://github.com/debrief/debrief-future/tree/main/specs/005-chromeos-testing-setup)
→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
