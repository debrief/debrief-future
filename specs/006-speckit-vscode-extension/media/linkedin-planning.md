Maritime analysts shouldn't need a separate application just to view their track data. We're building Debrief directly into VS Code.

Our VS Code extension (Stage 6 of Future Debrief) brings tactical analysis where developers and scientists already work. Browse STAC catalogs in Explorer. Display plots on interactive Leaflet maps with 10k+ track points. Select tracks and discover context-sensitive analysis tools. Execute calculations and view results as overlay layers.

The key architectural choice: the extension contains zero domain logic. It's pure orchestration connecting our existing services — debrief-config for settings, debrief-stac for data, debrief-calc for analysis. Scientists can improve algorithms without touching the extension; extension developers can refine UX without understanding geodetic calculations.

Technical decisions include canvas rendering for performance at scale, FileSystemProvider for native Explorer integration, and MCP client for dynamic tool discovery.

We're seeking feedback on sidebar organization, selection patterns, and export requirements. If you work with maritime track data or VS Code extension development, your input shapes what we build.

[Link to full planning post]

#FutureDebrief #VSCode #MaritimeAnalysis
