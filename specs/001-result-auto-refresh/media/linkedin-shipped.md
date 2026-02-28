Re-running an analysis tool in Future Debrief now updates the chart in place — zoom and pan state included. That last part turned out to be the interesting engineering problem.

Vega doesn't expose a simple "update data, keep view state" API. The solution was to extract signals before re-rendering and restore them after. It works, but it required understanding which signals are safe to replay and which ones should be left alone when the data shape changes.

The rest of the feature followed from that: an AutoRefreshController in the service layer subscribes to ResultIdRegistry change events, debounces rapid updates at 300ms per result ID, and defers refreshes for background tabs. Multiple charts refresh independently. A pause/resume toggle holds pending updates when an analyst needs to study a result without interruption.

This closes out Epic E04 (Results Visualization). 49 unit tests and 6 E2E tests, all passing.

[Read the full post](link-to-blog-post)

#FutureDebrief #MaritimeAnalysis #OpenSource
