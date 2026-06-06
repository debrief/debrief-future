# Generated TypeScript — before/after the prefix transform (#256)

The schema-driven step in `generate.py` rewrites each modelled slot's emitted
key to its LinkML `slot_uri`, across three classes. Non-extension `StacAsset`
slots (`href`/`type`/`roles`) are untouched, proving the rule's selectivity.

```diff
  export interface StacExtensionProperties {
-     platforms?: PlatformRecord[],
-     tags?: string[],
-     feature_tags?: string[],
-     overrides?: string[],
-     provenance_log?: PropertiesProvenanceEntry[],
+     'debrief:platforms'?: PlatformRecord[],
+     'debrief:tags'?: string[],
+     'debrief:feature_tags'?: string[],
+     'debrief:overrides'?: string[],
+     'debrief:provenance_log'?: PropertiesProvenanceEntry[],
  }

  export interface StacSummaries {
-     debrief_platforms?: PlatformRecord[],
-     debrief_tags?: string[],
-     debrief_feature_tags?: string[],
+     'debrief:platforms'?: PlatformRecord[],
+     'debrief:tags'?: string[],
+     'debrief:feature_tags'?: string[],
      [key: string]: unknown,
  }

  export interface StacAsset {
      href: string,            // untouched (no extension slot_uri)
      type?: string,           // untouched
      title?: string,          // untouched
      description?: string,    // untouched
      roles?: string[],        // untouched
+     'debrief:toolId'?: string,            // NEW modelled slot
+     'debrief:snapshotTimestamp'?: string, // NEW modelled slot
      [key: string]: unknown,
  }
```

## Determinism + drift gate

- Running `generate.py` twice produced **byte-identical** TS and Pydantic output.
- The committed artefacts under `shared/schemas/src/generated/` match a fresh
  generator run, so the existing `src/generated` CI drift gate
  (`git diff --exit-code -- src/generated/` in `schema-tests.yml`) passes with
  no new gate introduced (FR-007 / C6).
