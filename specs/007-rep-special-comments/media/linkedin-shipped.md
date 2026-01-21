REP files aren't just track data—they're also tactician annotations. For 25 years, these circles, vectors, text labels, and narrative comments have been embedded in the files Debrief reads. We just shipped full annotation parsing.

NARRATIVE, CIRCLE, RECT, LINE, VECTOR, TEXT annotations now emerge as structured GeoJSON objects alongside the tracks they belong to. No breaking changes. The parser maintains 100% backward compatibility while unlocking context that was previously buried in the file format.

189 tests passing. All existing data continues working exactly as before. New tools and analysis extensions can now work with the complete tactical picture—tracks plus the spatial and narrative annotations that give them meaning.

This is what happens when a 25-year-old format gets the treatment it deserves: complete, not fragmented.

[Read how we did it][BLOG_POST_URL]

#FutureDebrief #MaritimeAnalysis #OpenSource
