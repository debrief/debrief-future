# Contract: Prefix-Aware `StacExtensionProperties` Generation

**Feature**: 256-prefix-aware-stac-typing
**Status**: Draft (Phase 1)

This contract defines the observable behaviour of the prefix-aware generator
step and the resulting type surface. It is the normative reference for tasks
and tests.

## C1 — Generated type shape (three classes)

The generated types in `shared/schemas/src/generated/typescript/types.ts` MUST
declare each LinkML-modelled extension slot under its `slot_uri` key, across all
three target classes:

```ts
export interface StacExtensionProperties {
  'debrief:platforms'?: PlatformRecord[];
  'debrief:tags'?: string[];
  'debrief:feature_tags'?: string[];
  'debrief:overrides'?: string[];
  'debrief:provenance_log'?: PropertiesProvenanceEntry[];
}

export interface StacSummaries {
  'debrief:platforms'?: PlatformRecord[];
  'debrief:tags'?: string[];
  'debrief:feature_tags'?: string[];
  [key: string]: unknown;
}

export interface StacAsset {
  href: string;
  type?: string;
  title?: string;
  description?: string;
  roles?: string[];
  'debrief:toolId'?: string;            // NEW (slot_uri-derived)
  'debrief:snapshotTimestamp'?: string; // NEW (slot_uri-derived)
  [key: string]: unknown;
}
```

- Keys MUST be the `slot_uri` values verbatim (string-literal, quoted).
- Value types MUST be unchanged from current generation (existing slots).
- Non-extension `StacAsset` slots (`href`, `type`, `title`, `description`,
  `roles`) MUST be left unrewritten.
- `StacExtensionProperties` MUST NOT carry an index signature itself (openness is
  provided by the derived `StacItemProperties`); `StacSummaries` and `StacAsset`
  retain theirs.

## C2 — Derived open surface

`StacItemProperties extends StacExtensionProperties` MUST continue to declare
`[key: string]: unknown`. Therefore:

- `props['debrief:provenance_log']` → `PropertiesProvenanceEntry[] | undefined`
- `props['debrief:overrides']` → `string[] | undefined`
- `props['datetime']` → `string` (STAC core, declared)
- `props['debrief:label']` / `props['processing:foo']` → `unknown` (open content;
  `debrief:label` is intentionally **not** modelled — it is a feature/annotation
  key, not a STAC property)
- `asset['debrief:toolId']` → `string | undefined` (modelled on `StacAsset`)
- `asset['debrief:snapshotTimestamp']` → `string | undefined`
- `summaries['debrief:platforms']` → `PlatformRecord[] | undefined`

## C3 — Compile-time safety (type-level test assertions)

```ts
import type { StacItemProperties, PropertiesProvenanceEntry } from '@debrief/schemas';

declare const props: StacItemProperties;

// PASS: modelled prefixed key resolves to the named slot type
const log: PropertiesProvenanceEntry[] | undefined = props['debrief:provenance_log'];

// PASS: open content still permitted
const label: unknown = props['debrief:label'];

// @ts-expect-error — typo'd modelled key is NOT the named slot; assigning its
// `unknown` value to a concrete type must fail
const bad: PropertiesProvenanceEntry[] = props['debrief:provenence_log'];

// @ts-expect-error — wrong value type for a modelled slot
const wrong: number[] = props['debrief:overrides'];

// --- Write path (FR-012): props typed as StacItemProperties, not Record<string,unknown> ---
declare const writable: StacItemProperties;
writable['debrief:overrides'] = ['a', 'b'];          // PASS — string[]
// @ts-expect-error — wrong value type on a modelled-key WRITE must fail
writable['debrief:overrides'] = [1, 2];
writable['datetime'] = '2026-06-02T00:00:00Z';        // PASS — arbitrary/core key via index sig

// --- Asset path (FR-011 / SC-007): no hand-cast ---
import type { StacAsset } from '@debrief/schemas';
declare const asset: StacAsset;
const toolId: string | undefined = asset['debrief:toolId'];                 // PASS
const ts: string | undefined = asset['debrief:snapshotTimestamp'];          // PASS
// @ts-expect-error — wrong value type for a modelled asset slot
const badTool: number = asset['debrief:toolId'];
```

> Note: because the surface is open (`[key: string]: unknown`), a *typo'd key*
> resolves to `unknown` rather than erroring at the access; the error surfaces
> when that `unknown` is used as a concrete type (as above) or when an explicit
> annotation is applied. This is the strongest guarantee compatible with STAC
> open content and is sufficient for FR-004 (mis-typed access no longer silently
> yields a usable typed value).

## C4 — Generator determinism & self-guard

- Running `generate.py --target typescript` twice on the same LinkML source
  MUST produce byte-identical output (Article I.4 reproducibility; mirrors the
  #240 `source_file` normalisation precedent).
- The post-processor step MUST `raise RuntimeError` if the
  `StacExtensionProperties` block or any expected bare-key token is missing,
  so an upstream gen-typescript change cannot silently revert to bare keys.

## C5 — Schema-driven (automatic flow)

Adding a slot to any of the three target classes with `slot_uri: debrief:<name>`
and regenerating MUST emit `'debrief:<name>'?: <type>` with **no edit** to
`generate.py` and **no edit** to any writer-owned type. The transform MUST be a
pure function over `(block_text, slot_uri_map)` and MUST NOT hard-code field
names or per-class string rules. Slots without an extension `slot_uri` MUST be
left unchanged. (Acceptance: US1 / FR-002 / FR-013 / VR-4; proved by a pytest
pure-function unit test fed a synthetic added slot.)

## C8 — Write-path typing (FR-012)

Both writer hosts MUST type their mutation-path properties local as
`StacItemProperties` (not `Record<string, unknown>`):

- `apps/vscode/src/services/stacService.ts:1315` — the
  `as Record<string, unknown>` cast and its `ADR-011` eslint-disable MUST be
  removed.
- `apps/web-shell/src/services/stacWriterIdb.ts:309` — the
  `: Record<string, unknown>` annotation MUST become `: StacItemProperties`.

Arbitrary/core-key writes (`props[k] = v` over `Object.entries(patch)`) MUST
still type-check via the inherited `[key: string]: unknown` index signature. A
mis-typed *modelled-key write* MUST fail the build.

## C9 — StacAsset modelling (FR-011)

`StacAsset` MUST gain `tool_id` (`slot_uri: debrief:toolId`) and
`snapshot_timestamp` (`slot_uri: debrief:snapshotTimestamp`), both `range:
string`, optional. The hand-cast `asset as StacAsset & { 'debrief:toolId'?:
string }` at `stacService.ts:674` MUST be removed. `gen-pydantic` regen of
`StacAsset` MUST be additive (two optional fields) and MUST round-trip.
`debrief:label` MUST NOT be modelled (it is not a STAC property).

## C6 — Drift gate

After regeneration the committed `types.ts` MUST match the generator output.
The existing CI gate (`git diff --exit-code -- src/generated/` in
`schema-tests.yml`; `task schema:check-drift`) enforces this — no new gate is
introduced. (FR-007.)

## C7 — Runtime invariance

The on-disk JSON produced by either writer host for a given input MUST be
byte-for-byte identical before and after this feature. (FR-008 / VR-3;
acceptance via existing stac-writer round-trip/overlay tests.)
