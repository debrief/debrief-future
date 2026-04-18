If your Linux workstation's keyring does not auto-unlock in the morning, our NL search tells you to add an API key you already added. That has been quietly wrong for months, and the fix sends you to a settings page that cannot solve the problem.

We are planning a change: when the OS keyring is locked, show a distinct banner that names the real cause and offers Retry — not Open Settings. The existing "not configured" banner keeps its original meaning (feature off, or no key ever stored). One misleading path becomes two honest ones.

Zero new dependencies, zero new settings. Banner copy adapts per platform so Linux analysts, who hit this most, get guidance that matches their desktop. Layers on top of the parent VS Code NL-search feature.

We would value feedback before we build it — particularly on the banner wording and whether a "Learn more" link to a troubleshooting doc is the right affordance for someone whose morning has just been derailed.

[link to blog post]

#FutureDebrief #MaritimeAnalysis #OpenSource
