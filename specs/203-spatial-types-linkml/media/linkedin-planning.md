A `Coordinate` is a longitude and a latitude. In the Future Debrief codebase it is declared three times — once in the LinkML schema as an object, and twice more as a tuple in two TypeScript packages. Same story for `ViewportPolygon` and `TimeFilter`.

Nothing fails loudly when three declarations of the same concept drift apart. But every feature that touches the map or the time slider pays a small tax in conversion code and careful-reviewer attention. That tax adds up.

Feature 203 is the cleanup: the LinkML schema becomes the single source of truth, the duplicate TypeScript types are deleted, and two small converter helpers (`toGeoJSONCoord` / `fromGeoJSONCoord`) confine tuple-form handling to a narrow GeoJSON and Leaflet boundary. Object form (`{ longitude, latitude }`) becomes canonical everywhere else.

Open questions in the post: whether the silent rehydration migration is the right trade-off, and whether pulling the LinkML `TimeFilter` toward the runtime's epoch-millis shape is convergence or concession.

→ [Read the full post](https://debrief.github.io/debrief-future/#/spec/203)

#FutureDebrief #MaritimeAnalysis #OpenSource
