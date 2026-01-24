# LinkedIn Summary: REP File Import

Drag a REP file onto the map. Watch your tracks appear.

That's the new import flow in the Future Debrief VS Code extension. Either drag-and-drop onto an open map, or right-click any REP file and pick your target plot. Either way: file parsed, stored with provenance, tracks rendered, map zoomed to fit.

The interesting part is what we chose not to build. IoService only parses — it returns GeoJSON and knows nothing about storage. The extension orchestrates: parse here, store there, display over there. When we add new storage backends later, the parsing code stays untouched.

114 tests passing, including 24 just for error messages. Because when an analyst sees "invalid format at line 42, field: course" instead of "parse error", they can actually fix the problem.

Completes the tracer bullet for data import. Next: analysis tools.

https://debrief.github.io/2026/01/23/shipped-rep-file-import

#FutureDebrief #MaritimeAnalysis #OpenSource
