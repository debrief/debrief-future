How do you tell a map renderer "draw this track as a red dashed line with blue circle markers"?

In the Debrief rebuild, we're tackling this with schema-first styling. Three LinkML schemas — for points, lines, and polygons — define exactly how GeoJSON features can be styled. Property names match Leaflet directly, so frontends apply styling without translation.

The interesting bit: tracks need composite styling. A vessel track is both a line path AND a series of position markers. Our TrackStyle schema captures both in one structure.

We're keeping it simple for v1: basic shapes, standard CSS colors, SVG dash patterns. Icons and military symbols come later.

Now planning, feedback welcome. What styling capabilities matter most for tactical displays?

Read the full spec: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
