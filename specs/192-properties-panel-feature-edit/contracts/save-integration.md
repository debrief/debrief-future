# Contract — Integrated save path (closes Article I.3 silent-failure gap)

**Owners**: `shared/components/src/PropertiesPanel/__tests__/saveSession-integration.test.ts` (NEW Vitest);
the implementation glue lives in `ActivityPanel.tsx` (calls
`useStagedEdits.applyEditsToFeatures()` → `saveSession()` → on success,
`appendProvenance()` for each affected feature, then `clearAll()`).
**Source of truth**: this contract + research.md R-007

Closes the silent-provenance failure mode identified in `/speckit.review`
(no test in the prior plan asserted the four-way invariant below).

## The integrated invariant

Given a non-empty staging buffer and a triggered save, ALL of the
following MUST be observable in one test run:

1. The writer abstraction is invoked exactly once, with feature shapes
   that include the merged staged edits AND respect sparse-storage
   rules (no empty `vertex_metadata` arrays; no `null` values on slot
   omission; no presence of reverted slots).
2. `appendProvenance` is invoked once per affected feature, with a
   `LogEntry` whose:
   - `tool` === `'debrief.propertiesPanel'`
   - `method` === `'properties-panel@<version>'` (semver-pinned from
     the package)
   - `source` === `'user'`
   - `inputs[]` lists every edited path (feature-level slot names,
     vertex paths prefixed with `vertex_metadata[<path>]/<slot>`,
     reverted slots with `op: 'revert'`)
3. `useStagedEdits.clearAll()` is invoked after a successful writer
   call (and only then).
4. After all of the above, `isDirty()` returns `false`.

When the writer rejects (`saveSession` returns `{ success: false }`),
ALL of the following MUST hold instead:

1. `appendProvenance` is NOT invoked.
2. `clearAll()` is NOT invoked.
3. `isDirty()` remains `true`.
4. If the rejection matches `ReadOnlyFilesystemError` / Node `EACCES` /
   Node `EPERM`, the plot slice's `isReadOnly` transitions to `true`
   and `readOnlyReason` carries an analyst-readable string.

## Test outline

```ts
describe('save-session integration with staged edits', () => {
  it('flushes feature-level edits + provenance + clears buffer on success', async () => {
    const writer = mockWriter({ success: true });
    const appendProvenance = vi.fn();
    const staging = renderStagingHookWithEdits({
      byFeature: { 'track-A': { vessel_role: 'intercept', tags: ['acceptance'] } },
    });
    await saveViaActivityPanel({ staging, writer, appendProvenance });

    expect(writer).toHaveBeenCalledOnce();
    expect(writer.mock.calls[0][0].features).toMatchSparseShape(...);
    expect(appendProvenance).toHaveBeenCalledOnce();
    expect(appendProvenance.mock.calls[0][0]).toMatchObject({
      tool:   'debrief.propertiesPanel',
      method: expect.stringMatching(/^properties-panel@/),
      source: 'user',
      inputs: expect.arrayContaining([
        { path: 'vessel_role', op: 'set' },
        { path: 'tags',        op: 'set' },
      ]),
    });
    expect(staging.isDirty()).toBe(false);
  });

  it('flushes vertex-level edits as sparse VertexMetadata entries', async () => {
    // covers: append new entry, merge into existing entry, prune empty entry,
    // omit array when last entry removed.
    // …
  });

  it('flushes reverted fields as absent slots, with op:revert in provenance', async () => {
    // …
  });

  it('on writer rejection: no provenance, no buffer clear, dirty stays true', async () => {
    const writer = mockWriter({ success: false, error: new Error('boom') });
    const appendProvenance = vi.fn();
    // …
    expect(appendProvenance).not.toHaveBeenCalled();
    expect(staging.isDirty()).toBe(true);
  });

  it('on ReadOnlyFilesystemError: isReadOnly transitions, buffer preserved', async () => {
    const writer = mockWriter({ success: false, error: new ReadOnlyFilesystemError('locked') });
    // …
    expect(plotSlice.isReadOnly).toBe(true);
    expect(staging.isDirty()).toBe(true);
  });

  it('on EACCES Node error: isReadOnly transitions with permission-derived reason', async () => {
    // …
  });
});
```

## Constitutional alignment

- **Article I.3 (no silent failures)** — the rejected-write path is
  asserted to surface visibly (`isReadOnly` transition, banner) and
  to **not** silently log provenance.
- **Article III.1 (provenance always)** — the success path is asserted
  to produce exactly one provenance entry per affected feature.
- **Article III.3 (audit trail immutable)** — provenance is appended,
  never modified; the test verifies the entry is created, not mutated.
- **Article VI.3 (integration tests for workflows)** — this is the
  workflow integration test the prior plan was missing.

## Out-of-contract

- Writer-internal behaviour (filesystem semantics, atomic writes, etc.)
  — those are the writer abstraction's contracts, not this feature's.
- Provenance log rotation — handled by #194 and related work.
