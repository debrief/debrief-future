# TODO promotion — evidence

**Captured:** 2026-04-18
**Commit:** `f24c285` (`chore(todos): promote loader TODOs to tracked issues #472 + #473`)

## Issues filed

| File | Pre-change marker | Issue | URL |
|---|---|---|---|
| `apps/loader/src/main/ipc/config.ts:158` | bare `// TODO:` "Manage Stores" | **#472** | https://github.com/debrief/debrief-future/issues/472 |
| `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` | bare ` * TODO:` "Create new store" | **#473** | https://github.com/debrief/debrief-future/issues/473 |

Both issues filed via `mcp__github__issue_write` (atomic per-TODO promotion —
each `file issue → capture number → replace in-source comment` cycle landed
in a single working-tree change, no intermediate `TODO(#TBD)` or
`TODO(#NNN)` placeholder commit per Contract 5b).

## Before / after — `apps/loader/src/main/ipc/config.ts`

```diff
-// TODO: Add "Manage Stores" tab in the future for:
+// TODO(#472): Add "Manage Stores" tab for:
 // - Renaming stores
 // - Reordering stores
 // - Bulk cleanup of inaccessible stores
```

## Before / after — `apps/loader/src/renderer/components/StoreSelector/index.tsx`

```diff
- * TODO: Add "Create new store" button/link that opens the NoStoresView panel,
+ * TODO(#473): Add "Create new store" button/link that opens the NoStoresView panel,
  * allowing users to add a new store even when stores already exist.
```

## Audit — `apps/vscode/src/services/stacService.ts:1119` `TODO(#137)`

```text
$ grep -n "TODO(#137)" apps/vscode/src/services/stacService.ts
1119:  // TODO(#137): Delegate to Python MCP tool update_temporal_metadata when STAC MCP client is available
```

**GitHub issue #137:** state = **closed**, title = "Add feature proposal for
loading REP files into new plots". The issue is unrelated to the in-source
comment about delegating to a Python MCP `update_temporal_metadata` tool.

**Disposition:** the marker is stale, but it is a **pre-existing condition** in
`apps/vscode/` not introduced or modified by this PR. Per FR-013 scope, this
PR only **promotes** untracked TODOs (the two loader markers); auditing already
tracked references is recorded here for follow-up. Recommend filing a separate
backlog item to either (a) re-target the marker to a fresh issue covering the
delegation work, or (b) delete the comment if the delegation plan has been
abandoned.

## Pre-push guard transcripts (FR-020, SC-010)

```text
$ grep -rn "TODO(#NNN)" apps/ services/ shared/
(no output)
$ echo "exit=$?"
exit=1
```

```text
$ grep -n "TODO:" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx
(no output)
$ echo "exit=$?"
exit=1
```

```text
$ grep -n "TODO(#" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx
apps/loader/src/main/ipc/config.ts:158:// TODO(#472): Add "Manage Stores" tab for:
apps/loader/src/renderer/components/StoreSelector/index.tsx:4: * TODO(#473): Add "Create new store" button/link that opens the NoStoresView panel,
```

All three FR-020 / SC-010 conditions satisfied:

1. Zero `TODO(#NNN)` literal anti-patterns across `apps/`, `services/`, `shared/`.
2. Zero remaining bare `TODO:` markers in either of the two promoted files.
3. Both target files now carry exactly one `TODO(#<real-number>)` reference each.
