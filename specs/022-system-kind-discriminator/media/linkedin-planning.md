When you close and reopen an analysis, do you have to hunt for your place again? We're fixing that.

Future Debrief plots will preserve your exact working context — time window, map viewport, selected tracks. The approach: store this state as GeoJSON Features with null geometry, using reserved IDs like `state.temporal` for instant lookup.

It's a small schema extension, but it means the difference between "where was I?" and picking up exactly where you left off.

Planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
