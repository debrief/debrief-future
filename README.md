# Debrief

> *Getting analysis done, since 1995.*

Modernisation of Debrief maritime analysis platform (v4.x).

## Status

**Project phase:** Future Debrief — tracer bullet implementation

This is an active rebuild of the [legacy Debrief application](https://github.com/debrief/debrief) (v3.x, "Debrief NG"). The new version prioritises platform sustainability, Python-based extensibility, and reduced contractor dependency.

## What is Debrief?

Debrief is a maritime tactical analysis tool used for post-exercise reconstruction and analysis. Core capabilities include:

- Loading and visualising vessel tracks and sensor data
- Target Motion Analysis (TMA) for track reconstruction
- Temporal and spatial analysis of engagements
- Standardised reporting

## Why a Rebuild?

The legacy application is built on Eclipse RCP, a platform in decline. The modernisation:

- Replaces platform-locked architecture with platform-agnostic services
- Enables domain scientists to build Python tools without Java expertise
- Uses open standards (GeoJSON, STAC) for data portability
- Supports multiple frontends: VS Code extension, Electron apps, Jupyter notebooks

For the full strategic context, see [VISION.md](VISION.md).

## Documentation

| Document | Purpose |
|----------|---------|
| [VISION.md](VISION.md) | Strategic context — why we're rebuilding, value proposition, roadmap |
| [CONSTITUTION.md](CONSTITUTION.md) | Governing principles — the non-negotiable rules for all development |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical design — component structure, technology choices |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to participate — code standards, review process |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## Architecture

Key principles:

- **Thick services, thin frontends** — domain logic in Python, frontends handle only orchestration
- **Schema-first** — LinkML master schemas generate Pydantic, JSON Schema, and TypeScript
- **STAC for storage** — plots stored as STAC Items with GeoJSON payloads
- **MCP for integration** — services exposed via Model Context Protocol

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details.

## Repository Structure

```
debrief/
├── shared/            # Libraries consumed by other packages
│   ├── schemas/       # LinkML + generated Pydantic/JSON Schema/TypeScript
│   └── components/    # Shared React components (map, timeline, etc.)
├── services/          # Core services (stac, io, calc, config, mcp-common)
├── contrib/           # Organisation-specific extensions
├── apps/              # Electron loader, VS Code extension
└── docs/              # Detailed documentation
    └── plans/         # Implementation plans
```

## Current Plan

The tracer bullet implementation validates the architecture with a thin end-to-end thread. See [docs/plans/tracer-bullet.md](docs/plans/tracer-bullet.md) for details.

## Getting Started

*Coming soon* — setup instructions will be added as implementation progresses.

## Contributing

We welcome contributions. Please read:

1. [CONSTITUTION.md](CONSTITUTION.md) — understand the governing principles
2. [CONTRIBUTING.md](CONTRIBUTING.md) — learn how to participate

## License

Apache-2.0 — see [LICENSE](LICENSE).

## Links

- [Legacy Debrief (v3.x)](https://github.com/debrief/debrief)
- [Debrief website](https://www.debrief.info)
