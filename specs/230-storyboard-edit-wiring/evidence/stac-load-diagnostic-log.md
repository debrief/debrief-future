# STAC load diagnostic log

**Feature**: 230 | **FR**: 051, 052 | **Date**: 2026-04-24

## Symptom

Before this fix, plots that failed to load surfaced only
`Failed to load plot` — a generic `console.error` with no structured
attribution. Analysts could not tell whether the failure was:

- Item file not found
- Item JSON unreadable / malformed
- Required field (`properties.datetime`) missing
- A caught exception somewhere deeper in the pipeline

PR #520's manual-test thread reproduced a specific failing plot, but
triage stalled because the output channel said nothing about which
step had failed.

## Fix — diagnostic-first (per research R9)

Per the SRD §3.8 and research.md R9, the fix was **diagnostic-first**:
add structured logging at every null-return branch of
`StacService.loadPlot` without changing behaviour. The fix for the
underlying bug (if any) should follow once the diagnostic attribution
pins down the root cause.

### Diagnostic lines added

Each branch now writes a distinct `[stac.loadPlot]` line to the Debrief
output channel (wired from `extension.ts` via
`stacService.setDiagnosticSink(outputChannel)`):

| Branch | Diagnostic string |
|--------|-------------------|
| `loadItem()` returns null | `[stac.loadPlot] item-not-found or unreadable: store=... itemPath=... fullPath=...` |
| Item has no `properties` object | `[stac.loadPlot] item-has-no-properties: store=... itemPath=...` |
| `properties.datetime` missing | `[stac.loadPlot] item-missing-required-field properties.datetime: store=... itemPath=...` |
| Caught exception | `[stac.loadPlot] caught-exception: store=... itemPath=... fullPath=... error=...` |

### Wiring

In `extension.ts`:

```ts
stacService.setDiagnosticSink(outputChannel);
```

Installed alongside the existing `calcService.setOutputChannel(outputChannel)`
and `ioService.setOutputChannel(outputChannel)` wiring.

## Verification

- `apps/vscode/tests/unit/stacService.loadPlotDiagnostic.test.ts` —
  two tests:
  1. A non-existent item path produces a `[stac.loadPlot]` diagnostic
     line matching one of the four distinct strings.
  2. Malformed JSON in `item.json` also produces a `[stac.loadPlot]`
     diagnostic line.
- Both pass.

## Root-cause fix deferred

Per the SRD's diagnostic-first discipline, we did not attempt a
speculative fix on the #520 plot. With the diagnostic lines live, the
next attempt to reproduce `Failed to load plot` will record exactly
which branch triggered — at which point a targeted fix is cheap and
safe. This log will be updated with the "after fix" section once the
diagnostic output from an actual reproduction is in hand.

## Related

- Research: `research.md` R9.
- Spec: FR-051, FR-052, FR-053, SC-006.
- Files touched: `apps/vscode/src/services/stacService.ts`,
  `apps/vscode/src/extension.ts`,
  `apps/vscode/tests/unit/stacService.loadPlotDiagnostic.test.ts`.
