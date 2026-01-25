# LinkedIn Summary: Time Controller Planning

**Character count**: ~650 (within 700 limit for LinkedIn posts)

---

Static track plots show where vessels were. Animated playback shows how they got there.

We're building a time controller for Future Debrief's VS Code extension — a scrubber, play/pause, and speed controls that let analysts watch track data unfold rather than staring at a tangle of overlapping lines.

The problem it solves: When you're looking for a closest point of approach or trying to understand how two vessels interacted, seeing the movements in sequence reveals patterns that static views obscure.

Design choices: keyboard shortcuts for efficiency (Space for play/pause, arrows to scrub), adaptive time display that includes dates for multi-day operations, and speeds up to 8x for scanning long recording periods.

Part of the shared component library, so it'll work across our VS Code extension and future frontends.

Full planning post with technical details: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
