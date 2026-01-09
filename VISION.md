# Vision

> *Getting analysis done, since 1995.*

This document captures the strategic context for Future Debrief — the why behind the rebuild, the value proposition, and the long-term direction.

## Why Rebuild?

Debrief has served the maritime analysis community for nearly 30 years. The current version (v3.x, "Debrief NG") is built on Eclipse RCP — a platform now in decline. This creates three compounding problems:

1. **Platform risk** — Eclipse RCP receives diminishing investment. Finding developers with Eclipse expertise becomes harder each year.
2. **Contractor dependency** — the Java/Eclipse skill set means DSTL and other users rely on external contractors for any capability changes.
3. **Scientist exclusion** — domain experts who could build analysis tools are blocked by the Java barrier. Python is the lingua franca of scientific computing; Java is not.

The rebuild addresses all three by moving to a platform-agnostic, Python-first architecture.

## Primary Value Proposition

### For UK Defence Customers

**Platform sustainability** — Debrief v4 is designed to outlive any single contractor, technology choice, or funding cycle. The architecture explicitly avoids lock-in:

- Python services with no framework dependency
- Open standards for data (GeoJSON, STAC)
- Multiple frontend options (no single UI technology lock-in)
- Schema-first design enabling future migrations

**Reduced contractor dependency** — Scientists can build their own analysis tools in Python without touching the core platform. The extension model (`/contrib/`) supports organisation-specific capabilities maintained by domain experts.

**Aggregate analysis** — Legacy Debrief analyses one plot at a time. Version 4 introduces the ability to query across multiple exercises via STAC catalogs. Questions like "show me all initial detections where range was under 5nm" become answerable across an entire exercise archive.

### For NATO and International Partners

**I18N-ready** — user-facing strings externalisable for translation from day one.

**Offline-first** — works in air-gapped environments without modification. Cloud features are additive, never required.

**Open source, open standards** — no proprietary formats or vendor dependencies blocking adoption.

## Multi-Frontend Strategy

The architecture supports four consumption patterns from the same services:

| Frontend | Primary Use Case |
|----------|------------------|
| **VS Code extension** | Core analyst workflow — browse STAC, select features, invoke tools |
| **Electron loader** | File loading workflow — right-click to ingest data |
| **Jupyter notebooks** | Exploratory analysis — scientists working interactively |
| **Browser SPA** | Future: lightweight view-only access, dashboards |

This is not about building four applications. It's about building **one set of services** that any frontend can consume. The "thick services, thin frontends" principle means 90% of the logic lives in Python — frontends are lightweight orchestration layers.

## Migration Path from Legacy

Debrief v4 is not a fork or incremental update — it's a ground-up rebuild. The migration strategy:

1. **Data compatibility** — v4 can import legacy file formats (REP, etc.) via `debrief-io` handlers
2. **Parallel operation** — users can run v3 and v4 side-by-side during transition
3. **Feature parity not required** — v4 focuses on core workflows first; legacy features migrate based on demand
4. **No automatic migration** — users explicitly import legacy data into new STAC-based storage

Some legacy views and features will be retired rather than rebuilt. The goal is a sustainable platform, not a feature-complete clone.

## Roadmap Context

### Current Phase: Tracer Bullet (Q1 2026)

Validate the architecture with a thin end-to-end thread:
- Load a REP file → store in STAC → display in VS Code → run analysis tool → see results

This proves the components integrate correctly before investing in breadth.

### Near-term: Existing Stakeholder Engagement (Spring 2026)

Demonstrate the working foundation. Invite stakeholders to fund specific capabilities:
- TMA reconstruction tooling
- Organisation-specific file handlers
- Reporting and export features

### Medium-term: Capability Expansion

Based on user feedback and funding:
- Additional file format handlers
- Expanded analysis tool library
- Remote STAC server support for team collaboration
- NATO pilot deployment

### Long-term: Community Ecosystem

- Organisation-contributed extensions in `/contrib/`
- Community-developed analysis tools
- Integration with other defence analysis platforms

## Success Criteria

The rebuild succeeds if:

1. **UK defence scientists can build Python analysis tools** without contractor involvement
2. **Platform runs for 10+ years** without major architectural changes
3. **Multiple organisations deploy** with their own extensions
4. **Core workflows are faster** than legacy Debrief
5. **Data is portable** — users can extract their analysis in standard formats

## Non-Goals

To stay focused, Debrief v4 explicitly does not aim to:

- Replicate every legacy feature (some will be retired)
- Support real-time operational use (this is post-exercise analysis)
- Become a general-purpose GIS platform
- Provide cloud-hosted SaaS (offline-first is the priority)

---

*Document version: 1.0 — January 2026*
