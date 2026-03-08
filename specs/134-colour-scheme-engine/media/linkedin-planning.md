Eighty exercises on a map, all the same colour. You know the metadata is there -- vessel classes, date ranges, tags -- but you have to click each one to understand what you are looking at.

This week we are building a colour scheme engine for the Future Debrief Stack Browser. One dropdown: colour by Age, Vessel Class, or Tag. Every exercise on the map and timeline updates immediately, with a shared legend explaining the encoding.

The interesting architectural choice: the engine is headless. Pure functions produce a colour map for the map view and a colour function for the timeline -- both views stay decoupled. Twelve hand-curated colours, zero new dependencies, and an extensible dimension registry so organisations can add their own colour schemes without touching the core.

Planning post with full technical details and open questions about palette conventions and legend placement:

https://debrief.github.io/debrief-future/blog/planning-colour-scheme-engine

#FutureDebrief #MaritimeAnalysis #OpenSource
