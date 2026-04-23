# Planning: Epic Support for Large Feature Breakdown

We're adding epic support to our speckit workflow—enabling AI-assisted breakdown of large features into deliverable backlog items.

## What We're Building

Large features like our upcoming Storyboarding capability don't fit neatly into single backlog items. They need structured decomposition that maintains traceability and delivers incremental value.

The `/epic` command will:

1. **Accept feature specifications** — local documents, GitHub URLs, or text descriptions
2. **Analyze with Opus** — acting as both Business Analyst and Technical Architect
3. **Generate 3-10 deliverable items** — each independently valuable, properly sequenced
4. **Update BACKLOG.md** — new Epics section plus child items with `[E01]` traceability
5. **Create GitHub issues** — one per item for collaboration and tracking

## How It Fits

This builds on our existing speckit workflow:

```
/idea → backlog → /speckit.start → spec → plan → tasks → implement → PR
```

Epics add a layer above:

```
/epic → breakdown → /idea (per item) → [existing workflow]
```

Items retain full traceability to their parent epic via the `[Ex]` prefix pattern.

## Key Decisions

**Opus for breakdown**: The BA + Architect dual-role analysis requires Opus-level reasoning. We considered cost-optimized approaches but decided quality of breakdown is paramount—poor decomposition costs more in rework.

**[Ex] nomenclature**: Items from epics include a prefix like `[E01]` in their description. This keeps the existing BACKLOG.md schema intact while providing clear visual traceability.

**Offline fallback**: GitHub issue creation requires network, but the core breakdown works offline. Issues can be created locally and synced later.
