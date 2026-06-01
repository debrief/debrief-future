# Contract: Prefix-Aware `StacExtensionProperties` Generation

**Feature**: 256-prefix-aware-stac-typing
**Status**: Draft (Phase 1)

This contract defines the observable behaviour of the prefix-aware generator
step and the resulting type surface. It is the normative reference for tasks
and tests.

## C1 — Generated type shape

The generated `StacExtensionProperties` interface in
`shared/schemas/src/generated/typescript/types.ts` MUST declare each
LinkML-modelled extension slot under its `slot_uri` key:

```ts
export interface StacExtensionProperties {
  'debrief:platforms'?: PlatformRecord[];
  'debrief:tags'?: string[];
  'debrief:feature_tags'?: string[];
  'debrief:overrides'?: string[];
  'debrief:provenance_log'?: PropertiesProvenanceEntry[];
}
```

- Keys MUST be the `slot_uri` values verbatim (string-literal, quoted).
- Value types MUST be unchanged from current generation.
- The interface MUST NOT carry an index signature itself (openness is provided
  by the derived `StacItemProperties`).

## C2 — Derived open surface

`StacItemProperties extends StacExtensionProperties` MUST continue to declare
`[key: string]: unknown`. Therefore:

- `props['debrief:provenance_log']` → `PropertiesProvenanceEntry[] | undefined`
- `props['debrief:overrides']` → `string[] | undefined`
- `props['datetime']` → `string` (STAC core, declared)
- `props['debrief:label']` / `props['processing:foo']` → `unknown` (open content)

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

Adding a slot to `StacExtensionProperties` in `stac-extension.yaml` with
`slot_uri: debrief:<name>` and regenerating MUST emit
`'debrief:<name>'?: <type>` with **no edit** to `generate.py` and **no edit**
to any writer-owned type. (Acceptance: US1 / FR-002 / VR-4.)

## C6 — Drift gate

After regeneration the committed `types.ts` MUST match the generator output.
The existing CI gate (`git diff --exit-code -- src/generated/` in
`schema-tests.yml`; `task schema:check-drift`) enforces this — no new gate is
introduced. (FR-007.)

## C7 — Runtime invariance

The on-disk JSON produced by either writer host for a given input MUST be
byte-for-byte identical before and after this feature. (FR-008 / VR-3;
acceptance via existing stac-writer round-trip/overlay tests.)
