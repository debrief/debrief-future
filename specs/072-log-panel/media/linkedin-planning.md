Analysts regularly ask "what happened to this plot?" — especially after loading work from days or weeks ago, or inheriting someone else's analysis. The answer is scattered across memory, file timestamps, and manual notes.

We're building a Log Panel for Future Debrief that makes analytical history queryable. Every operation performed on a plot — imports, calculations, property edits, exports — gets recorded with full provenance metadata. The panel displays them as a filterable timeline. Click an entry, the map highlights the features that were affected.

This is Phase 2 of PROV logging. The schema foundation (#070) and recording service (#071) are in place. Now we're surfacing that history where analysts can see it. The panel gets its own activity bar icon — opening it is an explicit shift to retrospection mode, separate from active analysis.

Open question: should selecting a log entry replace your current feature selection, or maintain both contexts? We're leaning toward replacement for simplicity, but feedback could change that.

[LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
