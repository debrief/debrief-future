Two languages, one config file, zero disagreement about where your data lives.

This week we're planning debrief-config: a shared configuration service for Future Debrief that lets our Python maritime analysis services and Electron UI read from the same JSON file. When you register a STAC catalog in the UI, the Python tools find it immediately. No sync, no API calls, no duplication.

The interesting wrinkle: popular Node.js libraries for XDG config paths get macOS wrong (~/Library/Preferences instead of ~/Library/Application Support). Rather than fight platform inconsistencies, we wrote a 20-line implementation that matches Python's platformdirs exactly.

We're sharing the spec and design artifacts before writing code. If you've solved cross-platform config in dual-language projects, or spotted something we've missed, we'd genuinely like to hear it.

Read the planning post and join the discussion: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
