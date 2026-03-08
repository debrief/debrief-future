# Document STAC ID naming convention

## Category
Bug (missing documentation identified in best practices review)

## Problem
The STAC best practices compliance review (SRD §13.2.7) identified that Debrief's ID naming convention — lowercase characters, numbers, underscores, and hyphens only, no reserved URI characters — is compliant but undocumented.

Without explicit documentation, contributors may introduce IDs with uppercase letters, spaces, or reserved characters (`:`, `/`, `?`, `#`, `@`) that break search consistency and URI encoding.

This should have been captured as part of #125 (STAC Extension spec) but that item has already shipped.

## Proposed Fix
1. Add an "ID Conventions" section to the STAC Extension spec document produced by #125
2. State the rule: IDs must use only `[a-z0-9_-]` characters
3. Add a validation check (or at minimum a warning) in `plot.py` `create_plot()` when a custom `plot_id` is provided
4. Update contributor documentation to reference the convention

## Success Criteria
- ID naming convention documented in the STAC Extension spec
- Custom plot IDs validated against the pattern at creation time
- Existing test fixtures confirmed compliant

## Existing Code
- `services/stac/src/debrief_stac/plot.py` — `create_plot()` accepts optional `plot_id`
- STAC Extension spec from #125 (location TBD — check specs/125-* or docs/)

## Dependencies
None

## Complexity
Low

## Traceability
SRD action item BP-5 (§13.3 of `docs/stac-browser-srd.md`)
