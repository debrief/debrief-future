# Implementation Plan: Browser-Accessible Demo Environment

**Branch**: `005-chromeos-testing-setup` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-chromeos-testing-setup/spec.md`

## Summary

This feature creates a browser-accessible demo environment for Debrief, enabling testing from ChromeOS devices and stakeholder demonstrations without local installation. The environment uses a containerized Linux desktop (XFCE via noVNC) hosted on Fly.io, with VS Code and the Debrief extension as the primary interface. CI builds and publishes demo artifacts to GitHub Releases; the container fetches and installs them at startup.

## Technical Context

**Language/Version**: Bash (scripts), Python 3.11+ (services in artifact), YAML (CI/config)
**Primary Dependencies**: Docker, linuxserver/webtop:ubuntu-xfce, Fly.io, GitHub Actions
**Storage**: Ephemeral container storage + GitHub Releases for artifacts
**Testing**: Shell scripts (container tests), Python websocket-client (VNC connectivity), GitHub Actions CI
**Target Platform**: Fly.io (Linux containers), accessed via any web browser
**Project Type**: Infrastructure/DevOps (no traditional source structure)
**Performance Goals**: Container startup <30s, desktop latency <100ms, artifact download <30s
**Constraints**: Monthly cost <$10, offline-capable demo content, single shared session acceptable
**Scale/Scope**: Single demo instance, intermittent usage (auto-stop when idle)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | PASS | Demo environment is online by nature, but Debrief services within work offline |
| I.2 | No cloud dependencies in core | PASS | Cloud (Fly.io) is for demo hosting, not core functionality |
| I.3 | No silent failures | PASS | Startup script uses `set -e`, test layers verify each component |
| II.1 | Schema single source of truth | N/A | Infrastructure spec, no data schemas |
| III.1 | Provenance always | N/A | Demo uses sample data only |
| III.4 | Data stays local | PASS | No telemetry; demo is isolated environment |
| IV.1 | Services never touch UI | PASS | VS Code extension is the UI layer; Python services return data |
| IV.2 | Frontends never persist | PASS | VS Code extension calls services for persistence |
| VI.1 | Schema tests gate merges | N/A | Infrastructure spec |
| VI.2 | Services require unit tests | PASS | Services tested via Layers 4-7 |
| VI.4 | CI MUST pass | PASS | Test workflow defined with 7 layers |
| X.1 | No secrets in code | PASS | VNC password via Fly.io secrets |
| XII.1 | Public by default | PASS | Demo URL accessible to stakeholders |

**Gate Status**: PASS - No constitutional violations. This is an infrastructure feature supporting the demo/preview capability required by Article XII (Community Engagement).

## Project Structure

### Documentation (this feature)

```text
specs/005-chromeos-testing-setup/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technology research
├── quickstart.md        # Phase 1: Deployment guide
├── contracts/           # Phase 1: Configuration files
│   ├── Dockerfile
│   ├── fly.toml
│   └── build-demo-artifact.yml
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
demo/
├── Dockerfile           # Container definition
├── fly.toml             # Fly.io configuration
├── desktop/             # Desktop integration files
│   └── share/
│       ├── applications/
│       │   └── debrief-open.desktop
│       └── mime/
│           └── packages/
│               └── debrief.xml
├── bin/                 # Entry point scripts
│   ├── debrief-open
│   ├── healthcheck.sh
│   ├── test-components.sh
│   ├── test-desktop.sh
│   ├── test-pipeline.sh
│   ├── test-stac-workflow.sh
│   └── test-visual-smoke.sh
└── samples/             # Sample data files
    ├── example-track.rep
    └── multi-vessel.rep

.github/workflows/
├── build-demo-artifact.yml   # Build and publish artifact
└── test-demo.yml             # 7-layer test suite

tests/demo/
└── test_vnc_connect.py       # VNC connectivity test
```

**Structure Decision**: Infrastructure project with `demo/` directory for container assets, `.github/workflows/` for CI, and `tests/demo/` for test scripts.

## Complexity Tracking

No constitutional violations requiring justification.

## Implementation Phases

### Phase 0: Research (see research.md)
- Verify linuxserver/webtop image capabilities
- Validate Fly.io auto-start/stop behavior
- Confirm Python venv portability approach
- Test VS Code extension installation in container

### Phase 1: Design Artifacts
- Dockerfile with startup script
- fly.toml configuration
- CI workflow for artifact build
- Desktop integration files
- Test scripts for 7-layer validation

### Phase 2: Implementation (via /speckit.tasks)
- Create demo/ directory structure
- Implement Dockerfile
- Implement CI workflows
- Deploy to Fly.io
- Verify all test layers pass
