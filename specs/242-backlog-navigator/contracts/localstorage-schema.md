# Contract — localStorage schema

The navigator persists two namespaced keys in `localStorage`. Both are versioned via a key suffix so future shape changes can migrate or discard cleanly.

## Key 1: `backlog-navigator:github-pat`

**Purpose**: Personal Access Token + observed metadata. Identical envelope shape to `apps/spec-navigator/src/github/auth.ts`'s `Credential`, deliberately so that the backlog-navigator and spec-navigator can share the same PAT if the user chooses to use one (the keys are distinct so each app retains independent control of clear/set).

**Shape**:
```json
{
  "pat": "<github-pat>",
  "scopes": ["repo"],
  "login": "octocat"
}
```

**Lifecycle**:
- Set by the PAT-entry dialog (first edit, or via Settings).
- Read by every authenticated GitHub API call.
- Cleared by the user via Settings, or automatically on a 401 response.

**Article X handling**:
- Never logged.
- Never interpolated into thrown error messages or React error boundaries.
- Never sent to any host other than `api.github.com`.

---

## Key 2: `backlog-navigator:pending-edits:v1`

**Purpose**: All pending edits, plus the baseline they were staged against, so reloads do not lose work and so staleness can be detected at push time.

**Shape**:
```json
{
  "schemaVersion": 1,
  "baselineSha": "abc123...",
  "targetRef": "main",
  "mode": "live",
  "prNumber": null,
  "edits": [
    {
      "kind": "item-cell",
      "itemId": 235,
      "column": "status",
      "before": "proposed",
      "after": "approved",
      "stagedAt": "2026-05-02"
    },
    {
      "kind": "item-id-rename",
      "oldId": 237,
      "newId": 239,
      "stagedAt": "2026-05-02"
    },
    {
      "kind": "epic-cell",
      "epicId": "E10",
      "column": "status",
      "before": "proposed",
      "after": "approved",
      "stagedAt": "2026-05-02"
    }
  ],
  "lastModified": "2026-05-02"
}
```

**Field semantics**:
- `schemaVersion: 1` — bump when the shape changes; v1 is the only supported version at launch.
- `baselineSha` — the SHA of `BACKLOG.md` at the time the baseline was loaded. Used by FR-025 (staleness detection at push time) and by the parser cache (skip re-parse if the upstream SHA hasn't changed).
- `targetRef` — `"main"` in live mode; PR head branch name (`refs/heads/...` form NOT used; bare branch name) in PR mode.
- `mode` — `"live"` or `"pr"`. Never `"dry-run"`: dry-run is a deployment property (set by build-time/runtime config, see `vite.config.ts` + `VITE_BACKLOG_NAV_DRY_RUN`), not a stored property. A user editing on a dry-run preview deployment still has their staging preserved as `mode: "live"` — what differs is what happens on confirm.
- `prNumber` — set in PR mode; `null` otherwise.
- `edits` — array, ordered by `stagedAt` (ascending). The navigator preserves order so undo is LIFO and the structured summary respects user intent.
- `lastModified` — date of the most recent change to the envelope. Used to surface a "your pending edits are from {N} days ago" advisory if the reviewer has been away for a while.

**Lifecycle**:
- **Created**: on the first edit of a session (lazy — no key written until there is something to persist).
- **Updated**: on every edit, every undo, every staging-mutating action.
- **Cleared**: on a successful push (live or pr mode); on user-invoked "discard all pending edits"; on schema-version-bump migration.
- **Read**: on app load, after the baseline is fetched. If the stored `baselineSha` does NOT match the freshly-fetched SHA, the navigator surfaces a "stale staging baseline" prompt offering: re-apply (best-effort, may surface conflicts) or discard.

**Size budget**:
- Browser localStorage cap is 5MB per origin.
- Worst-case envelope at 230 items × 12 columns × ~500 bytes per cell ≈ 1.4MB — comfortably within budget.
- Soft-warning threshold: 1MB serialised payload; the navigator surfaces a banner suggesting the reviewer push or discard before staging more.

---

## Key 3 (reserved): `backlog-navigator:settings:v1`

**Purpose** (planned, may slip to a follow-up): per-user preferences such as default sort key, default filter set, "expand all descriptions" preference. Not part of v1 ship; key namespace reserved.

---

## Cross-tab behaviour

Out of scope for v1 (per spec Edge Cases). The navigator does not subscribe to the `storage` event; concurrent tabs result in last-write-wins on the staging envelope. A future enhancement could add `BroadcastChannel`-based sync (already a project dependency in #236), but is explicitly deferred.

## Migration

When schema bumps to `v2`:
1. On load, read both `:v1` and `:v2`.
2. If `:v2` exists, use it; ignore `:v1`.
3. If only `:v1` exists, attempt a synchronous migration (`migrateV1ToV2(parsed)`); on success, write `:v2` and remove `:v1`.
4. On migration failure, surface a recoverable banner offering to discard `:v1`.
