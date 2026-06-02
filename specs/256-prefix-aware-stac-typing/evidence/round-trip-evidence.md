# Round-trip / byte-invariance proof (#256)

This is a **Schema Change** feature; the required evidence is a round-trip proof
that the change is typing-only and behaviour-preserving (FR-008 / SC-004).

## Python → JSON → Python (Pydantic), incl. the new `StacAsset` keys

`test_stac_roundtrip.py::test_stac_asset_modelled_debrief_keys_roundtrip`:

```python
raw = {
    "href": "./range-bearing-result.geojson",
    "type": "application/geo+json",
    "roles": ["result"],
    "debrief:toolId": "range-bearing",
    "debrief:snapshotTimestamp": "2026-06-02T12:00:00Z",
}
asset = StacAsset.model_validate(raw)
dumped = asset.model_dump(mode="json", by_alias=True, exclude_none=True)
# dumped == raw — the colon keys survive; no spurious snake_case `tool_id` added.
```

Result: **passes**. The two newly-modelled asset keys round-trip byte-stable via
open content; modelling them adds typed TS slots without changing the persisted
shape. The existing `test_stac_asset_extension_keys_roundtrip`,
`test_stac_item_properties_extension_keys_roundtrip`, and
`test_stac_summaries_extension_keys_roundtrip` continue to pass (28/28 in
`test_stac_roundtrip.py`).

## Python → JSON → TypeScript → JSON

The TS side is verified by `tsc` over the generated `@debrief/schemas` types
plus `tests/ts/stac-prefix-typing-256.test.ts`, which round-trips and type-checks
`StacItemProperties` / `StacAsset` access under the prefixed keys. `pnpm
--filter @debrief/schemas typecheck` and `test` both pass (29 TS tests).

## On-disk invariance at the writer hosts

The cast removals and write-path re-typing changed **no runtime logic**. The
existing writer unit suites pass unchanged — **111** vscode
(`stacService.test.ts` + `resultsPanelService.test.ts`) and **54** web-shell
(`src/services/**`) — confirming identical behaviour and output.

## Determinism

`generate.py` run twice → byte-identical TS + Pydantic output (Article I.4 / C4).
The committed artefacts are drift-clean against a fresh run (C6).
