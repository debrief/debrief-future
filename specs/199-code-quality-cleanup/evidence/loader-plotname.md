# Loader `plotName` fix + regression test — evidence

**Captured:** 2026-04-18
**Commit:** `695d25d` (`fix(loader): resolve plotName from plot list for existing-plot branch`)

## New regression test (FR-021, SC-011)

`apps/loader/tests/unit/useLoadWorkflow.test.ts`:

```ts
describe('useLoadWorkflow.executeLoad — existing-plot branch', () => {
  it('returns plotName equal to display name (not id) when an existing plot is selected', async () => {
    const { result } = renderHook(() => useLoadWorkflow());

    const output = await result.current.executeLoad({
      sourceFile: SOURCE_FILE,
      store: STORE,
      mode: 'existing',
      existingPlotId: 'plot-abc-123',
      plots: PLOTS,
      onProgress: vi.fn(),
    });

    expect(output.plotName).toBe('Alpha Exercise Run');
    expect(output.plotName).not.toBe('plot-abc-123');
  });

  it('throws when the selected plot id is not present in the supplied plot list', async () => {
    const { result } = renderHook(() => useLoadWorkflow());

    await expect(
      result.current.executeLoad({
        sourceFile: SOURCE_FILE,
        store: STORE,
        mode: 'existing',
        existingPlotId: 'plot-not-in-list',
        plots: PLOTS,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow();
  });
});
```

## Green-state run

```text
$ pnpm --filter debrief-loader test
> debrief-loader@0.1.0 test
> vitest run

 ✓ tests/unit/types.test.ts  (7 tests) 5ms
 ✓ tests/unit/useLoadWorkflow.test.ts  (2 tests) 18ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
   Start at  16:21:19
   Duration  9.04s
```

## Revert-and-red sanity check (Contract 6)

Per FR-021's "MUST fail if regressed" requirement and the spec's Contract 6
failure-mode discipline, the test must be a **real** gate — not a tautology
that passes against any implementation.

**Step 1**: with the green tree (commit `695d25d` applied), temporarily
re-apply the placeholder behaviour:

```diff
       } else {
         if (!existingPlotId) {
           throw new Error('No plot selected');
         }
-        const selectedPlot = plots?.find((p) => p.id === existingPlotId);
-        if (!selectedPlot) {
-          throw new Error(`Plot ${existingPlotId} not found in supplied plot list`);
-        }
         plotId = existingPlotId;
-        plotName = selectedPlot.name;
+        plotName = existingPlotId; // SANITY CHECK — placeholder regression
       }
```

**Step 2**: re-run loader tests:

```text
$ pnpm --filter debrief-loader test
…
 ❯ tests/unit/useLoadWorkflow.test.ts:84:5
     82|         onProgress: vi.fn(),
     83|       })
     84|     ).rejects.toThrow();
       |     ^
     85|   });
     86| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 7 passed (9)
```

Both new tests went RED with the expected assertion failures (display-name
test failed because `plotName === 'plot-not-in-list'` was returned in place
of the expected throw; the missing-plot test similarly failed because the
placeholder returns the id rather than rejecting).

**Step 3**: revert the placeholder, restore the fix:

```diff
       } else {
         if (!existingPlotId) {
           throw new Error('No plot selected');
         }
+        const selectedPlot = plots?.find((p) => p.id === existingPlotId);
+        if (!selectedPlot) {
+          throw new Error(`Plot ${existingPlotId} not found in supplied plot list`);
+        }
         plotId = existingPlotId;
-        plotName = existingPlotId; // SANITY CHECK — placeholder regression
+        plotName = selectedPlot.name;
       }
```

**Step 4**: re-run, confirm green:

```text
$ pnpm --filter debrief-loader test
…
 Test Files  2 passed (2)
      Tests  9 passed (9)
```

The revert-and-red sanity check confirms the test is a **real** regression
gate against the specific bug it was written to catch (Contract 6 satisfied).

## TODO removal (FR-012)

```text
$ grep -n "TODO" apps/loader/src/renderer/hooks/useLoadWorkflow.ts
(no output)
$ echo "exit=$?"
exit=1
```

The `TODO: Get actual name from plot list` placeholder is gone. SC-006 manual
UI check deferred — the hook unit test covers the data-flow portion of the
acceptance criterion; the UI surfaces `LoadResult.plotName` directly without
further transformation, so a behavioural change at the hook is sufficient.
