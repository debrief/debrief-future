Unit tests tell you each service works in isolation. They don't tell you what happens when one service's output becomes another service's input.

Future Debrief has three core Python services: io (parses maritime track files), stac (stores data in catalogs), and calc (runs analysis tools). Each has solid test coverage on its own. But a subtle change in how io formats a parsed track could silently break what calc expects to receive downstream -- and no existing test would catch it.

This week we're planning end-to-end workflow tests that exercise the complete pipeline: parse a REP file, store features in a STAC catalog, run analysis, persist results. The tests verify data contracts at every service boundary and trace provenance from final analysis result back to the original source file. Zero new dependencies, zero CI changes -- they slot into the existing test runner automatically.

Interested in the technical decisions behind test placement, fixture reuse, and cross-service contract verification? Full planning post here: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
