The Layers panel in Future Debrief currently shows tracks and multi-feature results as single entries. You can select a whole track, but not the individual position at 14:32:15 where something interesting happened. We're fixing that.

Feature 094 adds expand/collapse to the panel so you can drill into composite features — browse the 500 positions in a track, select the third polygon from a buffer zone calculation, compare specific moments in overlapping datasets. We're building on the selection path model from feature 053 and the position metadata work from feature 048, using a flattened-tree approach that keeps virtualisation simple even with hundreds of expanded children.

Key decision: expansion state is ephemeral UI, not persisted session state. Reload the panel, everything starts collapsed. One less thing to manage, one clearer boundary between interface and analysis.

Planning post: [link-placeholder]

#FutureDebrief #MaritimeAnalysis #OpenSource
