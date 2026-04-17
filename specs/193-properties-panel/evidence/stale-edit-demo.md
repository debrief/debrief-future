# Stale-edit demo: concurrent external modification of `item.json`

Demonstrates Scenario 4 from the spec (FR-014): when `item.json` is modified by another process between the Properties Panel's read and its write, the commit is rejected and the analyst is informed — no last-write-wins, no silent data loss.

## Unit test transcript

From `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`:

```typescript
it('throws StaleItemJsonError when mtime changed between read and write', async () => {
  // 1. Initial state
  writeItem(itemDir, makeItem({ title: 'Original' }));

  // 2. Start a commit: stub fs.statSync the FIRST read returns the real mtime,
  //    but the SECOND call (the pre-write re-stat) returns an older mtime.
  //    This simulates another process having modified the file in between.
  const realStat = fs.statSync;
  let statCall = 0;
  vi.spyOn(fs, 'statSync').mockImplementation((p) => {
    const result = realStat(p);
    if (++statCall === 2) {
      // fake a newer mtime for the re-stat
      return { ...result, mtimeMs: result.mtimeMs + 1000 };
    }
    return result;
  });

  // 3. Commit should throw StaleItemJsonError, NOT write the file.
  await expect(
    service.updateItemMetadata({
      storePath: storeDir,
      itemPath,
      patch: { title: 'Changed' },
      overrideFields: [],
      provenance: { tool: 'debrief.propertiesPanel', fields: ['title'] },
      packageVersion: '0.0.0',
    }),
  ).rejects.toBeInstanceOf(StaleItemJsonError);

  // 4. The file still holds the original value — no partial write, no provenance entry.
  const after = JSON.parse(
    fs.readFileSync(path.join(itemDir, 'item.json'), 'utf-8'),
  );
  expect(after.properties.title).toBe('Original');
  expect(after.properties['debrief:provenance_log']).toBeUndefined();
});
// ✅ Passes at commit 60159e0e
```

## End-user outcome

The webview observes a `properties:error` message with `errorName: 'StaleItemJsonError'`:

```json
{
  "type": "properties:error",
  "itemPath": "items/exercise-atlantic-2025/item.json",
  "errorName": "StaleItemJsonError",
  "message": "item.json was modified externally since this edit began"
}
```

The Properties form's `writeError` banner renders above the field list, the optimistic update is rolled back, and the form reloads from disk on the next hydrate.

## Why this matters

Without this check, two concurrent edits (e.g. the analyst editing in VS Code while a background STAC ingest modifies the same `item.json`) would silently overwrite each other. Article I.3 ("no silent failures") and FR-014 require that the loser is informed; Decision 9 chose mtime-fingerprint over locking because locking adds cross-platform complexity and this is the cheapest defensible solution for single-user, single-file edits.
