# Quickstart: NL Search — Per-Prompt Audit Trail (Opt-In)

**Feature**: 197-nl-audit-trail
**Audience**: Site administrators and security officers who want to enable forensic-grade capture of NL-search prompts and responses, and analysts who need to understand what the "audit capture active" indicator means.

This walk-through takes a fresh install with #191's NL search already working and ends with a one-line-per-call JSONL file that your SIEM agent can tail.

---

## Prerequisites

- Debrief extension installed with #191's NL search already configured (API key set, `debrief.nlSearch.enabled = true`, a submitted phrase has produced chips successfully at least once).
- You have write access to either `<ExtensionContext.globalStorageUri>` (the default — always writable by VS Code) or a site-standard SIEM-agent-watched directory.

## 1. Enable the audit trail

### For a single investigation workstation (user scope)

Open VS Code Settings (Ctrl/Cmd+,) and search for "Debrief NL search audit". Toggle `Debrief › Nl Search › Audit: Enabled` to **on**.

Or via `settings.json`:

```json
{
  "debrief.nlSearch.audit.enabled": true
}
```

### For site-wide enforcement (managed/workspace scope)

Place the setting in your site's managed-settings layer or in the repository's `.vscode/settings.json` committed under version control:

```json
{
  "debrief.nlSearch.audit.enabled": true,
  "debrief.nlSearch.audit.path": "/var/log/debrief/nl-audit"
}
```

VS Code's standard settings precedence applies: managed > workspace > user. Analysts on this install will see the toggle as "managed by policy" and cannot disable it.

## 2. Verify the indicator appears

Open the Catalog Overview panel (or any panel where the FilterBar is rendered). The audit-capture indicator appears immediately next to the NL-search indicator — no restart required. Hovering it reveals the tooltip:

> NL search audit capture is active. Every phrase you submit and every response from the model is recorded to the audit log for forensic review.

If the setting is off, no indicator is shown — and the FilterBar behaves byte-identically to #191 today.

## 3. Submit a phrase

Type a phrase into the FilterBar and press Enter, exactly as you would with #191's NL search. The call executes normally (you still see chips appear or a banner on failure). One audit record is written behind the scenes.

## 4. Inspect the audit log

### Default path

The audit log lives at:

| OS | Default Path |
|----|--------------|
| Windows | `%APPDATA%\Code\User\globalStorage\debrief.debrief-future\nl-audit.jsonl` |
| macOS | `~/Library/Application Support/Code/User/globalStorage/debrief.debrief-future/nl-audit.jsonl` |
| Linux | `~/.config/Code/User/globalStorage/debrief.debrief-future/nl-audit.jsonl` |
| code-server | `$CS_USER_DATA_DIR/User/globalStorage/debrief.debrief-future/nl-audit.jsonl` |

Tail the file to see records arriving in real time:

```bash
tail -f "$HOME/.config/Code/User/globalStorage/debrief.debrief-future/nl-audit.jsonl" | jq
```

Each line is one complete JSON record.

### Override path

If you set `debrief.nlSearch.audit.path` to `/var/log/debrief/nl-audit`, both the active file and the archive will live there: `/var/log/debrief/nl-audit/nl-audit.jsonl` and `/var/log/debrief/nl-audit/nl-audit-archive.jsonl`.

## 5. Example record

```json
{
  "schemaVersion": "1",
  "callIndex": 42,
  "timestampUtc": "2026-04-18T14:32:01.234Z",
  "provider": "anthropic",
  "model": "claude-haiku-4-5-20251001",
  "outcome": {
    "kind": "success",
    "durationMs": 1847,
    "responseBytes": 512,
    "model": "claude-haiku-4-5-20251001"
  },
  "phrase": "vessels near Bravo Bay last Tuesday",
  "responseBody": "{\"filter\":\"...\",\"lozenges\":[...]}",
  "responseBodyTruncated": false,
  "durationMs": 1847
}
```

## 6. Correlate against #191 telemetry

The #191 lean telemetry record for the same call appears in the `[nl-search/live]` Output Channel:

```text
[nl-search/live] callIndex=42 outcome=success durationMs=1847 responseBytes=512 model=claude-haiku-4-5-20251001
```

Both records carry the same `callIndex=42`. In your SIEM, a join on `callIndex` is the cross-reference query.

## 7. SIEM ingestion

### Splunk Universal Forwarder

Add to `inputs.conf`:

```ini
[monitor:///var/log/debrief/nl-audit/nl-audit.jsonl]
sourcetype = debrief_nl_audit
index = debrief_audit

[monitor:///var/log/debrief/nl-audit/nl-audit-archive.jsonl]
sourcetype = debrief_nl_audit
index = debrief_audit
```

Add to `props.conf`:

```ini
[debrief_nl_audit]
KV_MODE = json
TIME_PREFIX = "timestampUtc":"
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%3N%Z
```

### Elastic Filebeat

```yaml
filebeat.inputs:
  - type: filestream
    paths:
      - /var/log/debrief/nl-audit/nl-audit.jsonl
      - /var/log/debrief/nl-audit/nl-audit-archive.jsonl
    parsers:
      - ndjson:
          keys_under_root: true
          add_error_key: true
```

The JSON Schema at `specs/197-nl-audit-trail/contracts/audit-record.schema.json` is the authoritative field map — use it to build your SIEM field extractions.

## 8. Rotation behaviour

The active file `nl-audit.jsonl` caps at `debrief.nlSearch.audit.activeCap` entries (default 500). On the (cap+1)-th write, the oldest entry rotates into `nl-audit-archive.jsonl` and the active file shrinks back to the cap. SIEM agents tailing both files see every record exactly once; the archive file is append-only.

Adjust the cap:

```json
{
  "debrief.nlSearch.audit.activeCap": 1000
}
```

Lowering the cap after records exist does NOT truncate existing records — the lower cap applies forward from the next write (Article III.3 audit-trail-immutable).

## 9. What is captured on failures?

Every outcome class produces exactly one audit record, including:

| Outcome | `responseBody` | Notes |
|---|---|---|
| `success` | Full JSON body from the model | Normal happy path |
| `auth-failure` | Provider error body (if any) | e.g. `401` response |
| `rate-limit` | Provider error body (if any) | `429`; includes `retryAfterSeconds` |
| `provider-error` | Provider error body (if any) | `5xx` |
| `transport-error` | `null` | Network / cancelled / unknown |
| `timeout` | `null` | Timed out before body arrived |
| `malformed-response` | The body that failed to parse | `reason` distinguishes non-json / oversize / truncated |
| `not-configured` | `null` | Key missing; call never reached provider |
| `ceiling-reached` | `null` | Per-session cap hit; call never reached provider |

## 10. Troubleshooting

**I enabled the setting but no file appears.** Check that you've submitted at least one phrase since enabling. The file is created on first write, not when the setting flips.

**I see a warning `[nl-search/live] audit write failed: EACCES ...`.** The directory at `audit.path` is not writable by the VS Code user. The audit trail degrades gracefully — NL search still works, but no records are captured. Fix the permissions (or unset the override).

**My SIEM shows duplicate records.** You likely have the SIEM agent tailing both `nl-audit.jsonl` and `nl-audit-archive.jsonl` AND running two agent instances. Each file should be tailed by exactly one agent.

**The indicator stayed visible after I toggled off.** Open the Catalog Overview panel afresh; the indicator state is pushed via the `nlConfig` message on the next configuration-change event.

## 11. Disabling

Set `debrief.nlSearch.audit.enabled` back to `false`. The indicator disappears on the next `nlConfig` push; no further records are written. Existing records on disk remain (Article III.3 audit-trail-immutable). Manual deletion by the administrator is a site-policy decision, not a Debrief feature.
