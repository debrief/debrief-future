Most AI-assistant vendors bury the prompts. We're building a switch that records them — on purpose, on request, for the right reasons.

The NL-search feature landing in VS Code under #191 emits lean structured telemetry on every call: timestamp, outcome, duration, byte counts. It deliberately withholds the phrase the analyst typed and the body the model returned. That's the safe default.

#197 is the escape valve. When a site administrator turns on `debrief.nlSearch.audit.enabled`, every call produces one JSONL record — full prompt, full response body, correlation ID joining back to the telemetry line — shaped for direct Splunk / Elastic / Sentinel ingestion. Off by default. When it's on, a persistent in-surface indicator tells every analyst their phrases are being captured.

It exists because defence deployments ask a question vendors usually dodge: *exactly which phrases were typed on this workstation, and what did the model return?* Without a forensic-grade answer, NL search can't be approved for regulated environments at all.

The planning post walks through the six design decisions and asks which forensic-review use cases the flat record schema should cover that it currently doesn't.

[Read the planning post](link-placeholder)

#FutureDebrief #MaritimeAnalysis #DataSovereignty
