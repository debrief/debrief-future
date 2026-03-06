How do you let analysts build complex metadata queries without making them learn a query language?

We are building a filter bar for Future Debrief's STAC Browser where each active filter is a pill-shaped lozenge -- add one for vessel class, another for nationality, a third for duration, and the results narrow in real time across the map, feature list, and timeline. AND logic by default. For OR logic, drag lozenges into a group container: "Type 23 frigate OR Type 45 destroyer" becomes a visual grouping, not a syntax exercise.

Ten filter types, each with the right input method -- hierarchical dropdown for the vessel taxonomy, free-text for title search, fixed buckets for duration. The whole state serialises to CQL2 JSON, so saved filter configurations and future backend queries will use the same expressions.

The interesting constraint: keeping it discoverable without cluttering the bar. Still working through whether OR groups should surface automatically or stay behind a menu.

[LINK]
