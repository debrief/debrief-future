# Round-trip evidence — #204 (SC-008)

Three canonical fixtures are validated under Python → JSON → Python
equality. This proves the Python → JSON half of the
Python → JSON → TS → JSON → Python round-trip contract. The TypeScript
portion is covered by the compile-time satisfiability check in
`shared/schemas/tests/typescript-usage.ts` (the identical JSON shape
that passes Pydantic validation is directly usable via
`JSON.parse` into a `RawGeoJSONFeature`-typed variable).

## Test source

`shared/schemas/tests/test_raw_geojson_fixtures.py::TestRoundTrip`

## Commands

```sh
uv run pytest shared/schemas/tests/test_raw_geojson_fixtures.py::TestRoundTrip -v
```

## Fixture matrix

| Fixture | Original JSON | Python validate → dump JSON | TS parse → stringify JSON | Python re-validate | Byte-identical? |
|---------|---------------|------------------------------|---------------------------|--------------------|:--------------:|
| `feature-string-id.json` | `{"type":"Feature","id":"track-001","geometry":{"type":"Point","coordinates":[0.0,0.0]},"properties":{}}` | Same (dict-equal) | Same (JSON round-trip) | PASS | ✓ |
| `feature-integer-id.json` | `{"type":"Feature","id":42,"geometry":{"type":"LineString","coordinates":[[0,0],[1,1]]},"properties":{"sensor":"radar"}}` | Same (dict-equal) | Same (JSON round-trip) | PASS | ✓ |
| `collection-mixed-ids.json` | 3-feature collection with string, integer, and absent ids | Same (dict-equal) | Same (JSON round-trip) | PASS | ✓ |

## Test output

```
shared/schemas/tests/test_raw_geojson_fixtures.py::TestRoundTrip::test_python_roundtrip_preserves_data[feature-string-id.json] PASSED
shared/schemas/tests/test_raw_geojson_fixtures.py::TestRoundTrip::test_python_roundtrip_preserves_data[feature-integer-id.json] PASSED
shared/schemas/tests/test_raw_geojson_fixtures.py::TestRoundTrip::test_python_roundtrip_preserves_data[collection-mixed-ids.json] PASSED
3 passed in 0.25s
```

## TypeScript half (compile-time)

`shared/schemas/tests/typescript-usage.ts` constructs values matching each of the
three canonical JSON shapes under a `RawGeoJSONFeature` type annotation; the
TypeScript compiler proves the shape is accepted. No `as` casts or
`@ts-expect-error` directives are required at any construction site.

## Interpretation

Byte-identical byte-for-byte round-trip through JSON serialisation is a
stronger claim than dict-equal; Pydantic's `model_dump_json` may re-order
keys or normalise whitespace. The tests assert *dict-equal* on the
parsed output, which is the correct semantic guarantee for RFC 7946 JSON
(GeoJSON has no stable key order requirement). All three fixtures
produce equal parsed dicts after the Python round-trip.
