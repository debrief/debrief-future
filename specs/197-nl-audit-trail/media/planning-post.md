---
layout: future-post
title: "Planning: Forensic-grade audit trail for NL search (opt-in)"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, vscode, nl-search, audit, data-sovereignty, siem]
excerpt: "An opt-in escape valve for sites that need to know exactly which phrases analysts typed — and what the model returned."
---

## What We're Building

The NL-search pipeline that moved inside VS Code under #191 emits a lean structured telemetry line on every call — timestamp, provider, model, outcome class, duration, response byte count, call index. It deliberately omits two things: the phrase the analyst typed, and the body the model returned. That's a conscious data-sovereignty posture, not an oversight.

This feature adds the escape valve. When a site administrator flips `debrief.nlSearch.audit.enabled = true`, every NL-search call produces one line-delimited JSON record with the full prompt and the full (already-bounded) response body, correlated to the #191 telemetry line via `callIndex`. Off by default. When it's on, every NL-search surface shows a persistent, non-dismissable "audit capture active" indicator — nobody should be able to later claim surprise that their phrases were recorded.

The record is shaped for direct Splunk / Elastic / Sentinel ingestion. No custom transform, no Debrief-side viewer, no transport. The deploying site's existing SIEM agent tails the file.

## How It Fits

This is the second half of a deliberate split. #191 ships the working feature with minimal telemetry — safe for every deployment, including ones that don't have a SIEM and don't want prompts on disk. #197 is the lever a security officer or site administrator pulls when the forensic question lands on their desk: *"exactly which phrases were typed on workstation X between 14:00 and 15:00, and what did the model return?"*

The audit log doesn't replace the #191 telemetry — it complements it. Both channels can be independently gated, rotated, and permissioned. The `callIndex` field is the correlation key: an operator ingests both streams into their SIEM, joins on `callIndex`, and gets the complete picture of every call.

Architecturally this is small. One new extension-host service, `auditSink.ts`, owns the file I/O. It gets invoked from exactly two sites inside #191's `llmProxy.ts` — the `not-configured` short-circuit and the `finally` block after every `providerCall` resolution. Writes are fire-and-forget on a queue, so the audit sink never sits on the NL-search call's critical path. The webview learns about the setting through one new boolean on the existing `VsCodeLiveConfig` — no new message variants.

It also aligns cleanly with the constitution. Article III.1 says provenance always; the audit log *is* provenance for an AI-assisted action. Article III.4 says data stays local; the file is local-only, SIEM pickup is a site-deployed agent, not an outbound call. Article III.3 says the audit trail is immutable; overflow rotates into an append-only archive, existing entries never mutate.

## Key Decisions

Six decisions sit behind the design. The full research note is on the feature branch; the short version:

- **Log path: `ExtensionContext.globalStorageUri` by default, administrator-overridable.** Per-install, survives restarts, not synced across machines, permissioned to the current OS user on every supported platform. A site administrator who wants the file under a SIEM-agent-watched directory sets `debrief.nlSearch.audit.path` in managed settings; VS Code's standard precedence handles the pin.
- **Rotation reuses #193's pattern.** Active JSONL capped at 500 entries; overflow appended to a sibling archive file. Same atomic temp+rename helper the provenance log already uses. When the cross-cutting rotation policy lands under #194, both logs will move to the unified policy in a single PR.
- **Hook point is `llmProxy.ts`, not FilterBar and not `providerCall`.** The proxy is the single choke point — every outcome class, including `not-configured` and `ceiling-reached`, passes through it. Hooking the audit sink there guarantees "one record per call, regardless of outcome" as a single code-path invariant.
- **Record shape is flat, `schemaVersion`-tagged, response body at the top level.** SIEM field mappings are easier over flat records than nested trees. Placing `responseBody` alongside its `responseBodyTruncated` flag (rather than nested inside the outcome union) keeps "what the model said" decoupled from "how we classified it" — a malformed response still has a body worth keeping.
- **No API key, ever, in the audit output.** The sink is handed the call context *minus* the `apiKey` field — it never receives the credential as a parameter. A sentinel-value negative test fails CI if the key ever appears in a written record.
- **Failure surfacing is one-shot per session.** If an audit write fails (disk full, permissions, path missing), the NL-search call completes on its normal timing budget and one warning surfaces into the existing `[nl-search/live]` output channel. Repeat failures in the same session are silently rate-limited. Operators who look at the #191 channel for NL-search health find audit-failure notices in the same place.

## What We'd Love Feedback On

Three questions where outside perspective would help:

1. **What forensic-review use cases should the record shape cover that the current flat schema doesn't?** The draft record carries `callIndex`, `timestampUtc`, `provider`, `model`, `outcome`, `phrase`, `responseBody`, `responseBodyTruncated`, `durationMs`, and `schemaVersion`. If you've ingested this kind of log into a SIEM in anger, what have you wished was at the top level that typically isn't?
2. **Is a persistent in-surface indicator sufficient notice, or does the defence/DSTL context call for a first-run modal?** The spec treats workplace-policy notification as an out-of-band concern for the deploying organisation, with the indicator handling in-UI notice at the moment of typing. An explicit first-run modal has been deferred on that basis — is that the right call?
3. **Should the default `activeCap` of 500 entries hold, or should administrators start with a larger default for investigation workstations?** Analyst typical daily volume for NL search is on the order of tens of submissions — so 500 covers weeks of a heavy user. An investigation workstation running a stress scenario could turn that over much faster. The setting is administrator-raiseable, but the out-of-box default matters for "enabled without tuning" deployments.

The spec, plan, research notes, and the draft `AuditRecord` contract live on the `197-nl-audit-trail` feature branch. Implementation starts once the open questions have landed.

[Join the discussion on GitHub](link-placeholder)
