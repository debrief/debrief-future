# STAC `derived_from` Links for Provenance

## Epic
Standalone — complements existing provenance system (Constitution Article III)

## Problem
STAC best practices recommend using the `derived_from` link relation to track data provenance. Debrief tracks provenance via custom `debrief:provenance` properties on assets (source path, timestamp, tool version), but does not use STAC-native `derived_from` links at the Item level.

Adding `derived_from` links would enable:
- STAC-native provenance traversal across catalogs
- Interoperability with external STAC tools that understand `derived_from`
- A standards-compliant complement to the existing asset-level provenance

## Proposed Solution
1. When a plot is created from source files, add `derived_from` links pointing to source file assets
2. When calc tools produce result artifacts, add `derived_from` links on the result asset pointing to the input feature IDs
3. Ensure `derived_from` links coexist with existing `debrief:provenance` properties (additive, not replacing)

## Success Criteria
- Items created from source files include `rel: "derived_from"` links
- Result artifacts reference their input features via `derived_from` links
- Existing `debrief:provenance` properties remain unchanged
- STAC validation passes with the new links

## Existing Code
- `services/stac/src/debrief_stac/assets.py` — asset provenance tracking
- `services/stac/src/debrief_stac/artifacts.py` — result artifact storage with `debrief:toolId` and `debrief:sourceFeatures`
- `services/stac/src/debrief_stac/plot.py` — Item link management

## Dependencies
None

## Complexity
Low

## Traceability
SRD action item BP-6 (§13.3 of `docs/stac-browser-srd.md`)
