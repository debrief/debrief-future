We just shipped the Result ID Registry—a lightweight in-memory map that tracks which versions of analysis results are currently active. When a bearing-time plot or range calculation gets re-run with tweaked parameters, the registry updates instantly and notifies any view that cares about that result.

The architecture is simple: tools produce artifacts with stable logical IDs (like "bt_plot_001"), the registry maps each ID to its current versioned path, and views can subscribe to changes. On plot load, we hydrate from STAC metadata, so result tracking works even for plots saved in previous sessions.

37 new tests, zero regressions, 521 tests passing total. This is the foundation for auto-refresh—when analysts tune parameters, their result views refresh without manual reload.

#FutureDebrief #MaritimeAnalysis #ResultsVisualization
