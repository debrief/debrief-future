Clicking a track on a map and selecting the whole track is easy. Clicking a single position — one vessel fix, the moment of a course change — and telling the rest of the system precisely that is what we've been building up to.

Next in Future Debrief: selection entries become paths. `track-hms-defender/positions/4` identifies a specific position; arbitrary-depth paths support the segmented-track work coming later. Ctrl+click toggles individual entries, Shift+click selects contiguous ranges along a track, and the selection persists per plot so tab-switching doesn't erase your working set.

Three design questions we settled during the spec: why mixed ID + index addressing (because that's how the underlying data actually looks), why no backwards compatibility (Article XIV.1 — pre-release freedom), and why binary visual styles plus a primary overlay (because a per-depth colour ramp stops being legible at depth three).

Planning post details what's in scope, what's explicitly deferred, and where we'd most value early feedback before implementation.

→ Full post: [link]

#maritime #defence #softwaredesign
