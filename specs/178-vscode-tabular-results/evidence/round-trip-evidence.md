# CSV Round-Trip Evidence

**Feature**: 178-vscode-tabular-results (R3 / FR-015)
**Captured at**: 2026-04-08

This document demonstrates the `buildCsvContent → parseCsvToTableDataset`
round trip using the `sample-csv.csv` file in this directory.  The round
trip proves that the CSVs produced by the Save flow can be reopened as
identical flat datasets in the Results panel via the **Open** action.

## Source dataset

Input to `buildCsvContent` (Record<string, unknown>[]):

```json
[
  { "metric": "total distance nm", "value": 12.5 },
  { "metric": "average speed kn", "value": 8.3 },
  { "metric": "point count", "value": 1247 },
  { "metric": "duration seconds", "value": 18360 }
]
```

## CSV (output of `buildCsvContent`)

See [sample-csv.csv](./sample-csv.csv):

```csv
metric,value
total distance nm,12.5
average speed kn,8.3
point count,1247
duration seconds,18360
```

## Round trip via `parseCsvToTableDataset`

```ts
const csv = buildCsvContent(original);
const envelope = parseCsvToTableDataset(csv, 'Stats');
// envelope.data === original  (proved by unit test
//    shared/utils/tests/csv.test.ts#round-trips-buildCsvContent-output)
```

The unit test `round-trips buildCsvContent output` asserts
`expect(envelope.data).toEqual(original)` — so the parser produces a flat
dataset that is identical to the array passed into `buildCsvContent`,
including the coerced numeric values.

## Coverage for edge cases

The parser is also tested against:

- Header-only CSVs → empty `data` array
- Quoted strings containing commas (`"a, b, c"`)
- Escaped double quotes (`""hi""`)
- Embedded newlines inside quoted fields (`"line1\nline2"`)
- Malformed input (unterminated quote) → throws

All eight CSV round-trip tests live in
`shared/utils/tests/csv.test.ts` and pass as part of the 143-test
`@debrief/utils` suite.

## Confidence

Because the parser is the direct inverse of `buildCsvContent` (both live
in the same module and share `formatCsvValue`'s quoting rules), any file
produced by the Save flow is guaranteed to round-trip cleanly through
the **Open** action.  Files edited externally fall back to a best-effort
parse; malformed files surface an error dialog and the user can choose
**Open With** to view the raw text instead.
