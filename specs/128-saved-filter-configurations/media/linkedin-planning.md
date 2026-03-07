Analysts filtering exercises by vessel class, nationality, and duration shouldn't have to rebuild those filters every session.

Next up in the STAC Browser: saved filter configurations. One click saves the current filter bar state with a name. A Historic Filters dropdown restores it later. Everything persists locally across sessions.

The interesting design choice: we store the full UI state (lozenge arrangement, AND/OR grouping), not just the CQL2 query. CQL2 is portable but lossy — it can't reconstruct how filters were visually organised. Storing both gives us exact restoration plus future export capability.

Built on the filter bar (#127) and CQL2 engine (#126). No network, no server, no sync — just local persistence that works offline.

Part of E08: STAC Browser Discovery UI.

[Link to planning post]
