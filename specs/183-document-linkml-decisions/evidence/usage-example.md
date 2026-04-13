# Usage Example: Document LinkML Platform Override Decisions

## Finding a Decision

A contributor working on the CQL2 array filter (#185) needs to understand
why `debrief:platforms` is an array of objects rather than flat lists.

### Step 1: Search the decisions file

```bash
grep -n "flat aggregate\|platforms" docs/project_notes/decisions.md
```

This returns matches in ADR-014, which explains that flat aggregate fields
were removed (not retained) in favour of `debrief:platforms`, citing
Constitution Article XIV.

### Step 2: Read the ADR

ADR-014 is self-contained. The contributor learns:

- **What was decided**: Flat fields (`debrief:vessel_classes`,
  `debrief:nationalities`, `debrief:track_names`) are removed. `debrief:platforms`
  is the sole mechanism.
- **Why**: Constitution Article XIV.4 prohibits accepting multiple input formats;
  XIV.5 mandates fixing data rather than relaxing the schema.
- **What was rejected**: Keeping flat fields during a transition period. Formal
  deprecation period.
- **Trade-offs accepted**: All consumers must migrate atomically (~15 TS files,
  ~5 Python files, ~100 exercise fixtures).

The contributor does not need to find or read the original planning post.

### Step 3: Check related decisions

The contributor notices ADR-017 (complete fixture regeneration) is referenced
as a consequence of ADR-014. Reading ADR-017 confirms that all 100 exercise
fixtures are regenerated, not just new fixtures added.

## ADR Index

| ADR | Title | Keywords |
|-----|-------|----------|
| ADR-012 | VesselDomainEnum Placement in common.yaml | VesselDomainEnum, common.yaml, dependency direction |
| ADR-013 | PlatformRecord Is a STAC Extension Entity | PlatformRecord, stac-extension.yaml, resolved metadata |
| ADR-014 | Flat Aggregate Fields Removed, Not Retained | flat aggregate, debrief:platforms, Article XIV, breaking change |
| ADR-015 | PlatformRecord Only Requires `id` | PlatformRecord, sparse records, required fields |
| ADR-016 | Override Field Pattern Constraints | nationality, vessel_class, ISO 3166, pattern, regex |
| ADR-017 | Complete Fixture Regeneration | fixtures, exercise, regeneration, generate-stac-fixtures |
