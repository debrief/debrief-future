# Data Model: Browser-Based VS Code Extension Preview

**Feature**: 099-browser-extension-preview
**Date**: 2026-02-19

## Overview

This feature is infrastructure-only — no new application data entities are introduced. The "data model" describes the configuration files and deployment descriptors that define the preview environment.

## Configuration Entities

### Preview Container Image

The Docker image built from `preview/Dockerfile`.

| Attribute | Description |
|-----------|-------------|
| Base image | code-server official image (Debian-based) |
| Extension | `.vsix` file built from the current branch |
| Sample data | STAC catalogs + REP files copied into the image |
| Workspace | `.code-workspace` file pre-configured to open sample data |
| Port binding | `$PORT` environment variable (Heroku requirement) |
| Authentication | Disabled (`--auth none`) for ephemeral review environments |

### Heroku Review App Configuration (`app.json`)

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `debrief-preview` | App name prefix for review apps |
| `stack` | `container` | Use Docker container stack |
| `formation.web.quantity` | `1` | Single dyno per review app |
| `formation.web.size` | `basic` | Minimum dyno size (512MB RAM) |
| `pr-previews.auto_deploy` | `true` | Auto-deploy on PR creation |
| `pr-previews.destroy_stale` | `true` | Auto-destroy closed/merged PR apps |

### Heroku Container Definition (`heroku.yml`)

| Field | Value | Purpose |
|-------|-------|---------|
| `build.docker.web` | `preview/Dockerfile` | Path to Dockerfile |
| `run.web` | (uses Dockerfile CMD) | Entrypoint defined in image |

### VS Code Workspace File (`debrief-preview.code-workspace`)

| Field | Value | Purpose |
|-------|-------|---------|
| `folders` | `[{"path": "samples"}]` | Opens sample data directory |
| `settings.debrief.stacCatalogPath` | `samples/local-store` | Points extension to STAC data |
| `settings.workbench.startupEditor` | `readme` | Opens WELCOME.md on startup |

## Relationships

```
PR opened on GitHub
  └─→ Heroku Review Apps (app.json)
        └─→ heroku.yml
              └─→ Docker build (preview/Dockerfile)
                    ├─→ code-server binary
                    ├─→ .vsix extension (built in image)
                    ├─→ Sample data (copied from repo)
                    └─→ Workspace config (.code-workspace)
                          └─→ Reviewer opens browser
                                └─→ VS Code UI with extension active
```

## State Transitions

The preview environment has a simple lifecycle:

| State | Trigger | Description |
|-------|---------|-------------|
| **Not deployed** | (initial) | No review app exists |
| **Building** | PR opened/updated | Heroku builds the container image |
| **Running** | Build succeeds | code-server is accessible at the review app URL |
| **Failed** | Build or start fails | Heroku shows error page |
| **Destroyed** | PR closed/merged | Review app is torn down automatically |

No persistent state. Each deployment starts fresh from the Docker image.
