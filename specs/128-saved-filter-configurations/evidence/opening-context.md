## What We're Building

The filter bar (#127) lets analysts combine vessel class, nationality, duration, and seven other filter types to narrow down exercises. But every time they close the application, those filters vanish. Analysts who routinely work with the same subset — say, UK submarine exercises shorter than 24 hours — have to rebuild from scratch each session.

Saved filter configurations solve this. A Save button in the filter bar captures the current lozenge arrangement as a named configuration. A Historic Filters dropdown sits next to it, listing everything saved. One click restores the full filter set. Another click deletes entries that are no longer useful.

## How It Fits

This is part of E08 (STAC Browser Discovery UI), the analyst-facing interface for browsing and filtering exercises. The filter bar (#127) and CQL2 filter engine (#126) handle the "what can I filter by" question. Saved filters handle "how do I get back to filters I've used before."

Everything is stored locally — VS Code workspace state or browser localStorage depending on the frontend. No server, no sync, no network dependency. The saved state is the actual FilterBarState structure from #127, so restoration is exact: same lozenges, same AND/OR grouping, same values.

## Key Decisions

- **Persist FilterBarState, not just CQL2 JSON.** CQL2 is lossy — it can't reconstruct the exact lozenge arrangement. We store both, but FilterBarState is authoritative for restoration.
- **Platform-agnostic storage interface.** A simple load/save abstraction lets VS Code use workspaceState and web-shell use localStorage. Same components, different persistence backends.
- **Auto-generated names when users skip naming.** Joining filter labels with "+" gives something like "Submarine + UK + <24H" — immediately recognisable without requiring user effort.
- **Workspace-scoped, not global.** Saved filters belong to the workspace where they were created. Different catalogs get different saved filter sets.
