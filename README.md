# Debrief

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

## Why a rebuild?

The legacy application is built on Eclipse RCP, a platform in decline. The modernisation:

- Replaces platform-locked architecture with platform-agnostic services
- Enables domain scientists to build Python tools without Java expertise
- Uses open standards (GeoJSON, STAC) for data portability
- Supports multiple frontends: VS Code extension, Electron apps, Jupyter notebooks

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions and component structure.

Key principles:

- **Thick services, thin frontends** — domain logic in Python, frontends handle only orchestration
- **Schema-first** — LinkML master schemas generate Pydantic, JSON Schema, and TypeScript
- **STAC for storage** — plots stored as STAC Items with GeoJSON payloads
- **MCP for integration** — services exposed via Model Context Protocol

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
```

## Getting Started

*Coming soon* — tracer bullet implementation in progress.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0 — see [LICENSE](LICENSE).

## Links

- [Legacy Debrief (v3.x)](https://github.com/debrief/debrief)
- [Debrief website](https://www.debrief.info)
