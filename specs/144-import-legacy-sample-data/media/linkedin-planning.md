148 legacy Debrief sample files, three different formats, a decade of real maritime analysis scenarios. This week we're importing all of them into a STAC catalog that ships with the repository.

The goal: clone the repo, open it, and you're immediately browsing track data from tutorial exercises, multi-static sonar scenarios, and SATC algorithm test cases. No setup, no file hunting.

We're building a DPF (XML) parser and DSF sensor file handler to sit alongside the existing REP parser. One plot per source file, provenance tracked, original files preserved as STAC assets. Sensor contacts without explicit coordinates keep their bearing and range data with null geometry -- nothing fabricated, nothing lost.

The interesting constraint: no new dependencies. DPF is well-structured XML, so Python's stdlib ElementTree handles it. DSF files reuse the existing REP sensor line format, so the handler just delegates.

The committed catalog becomes the default dataset for every demo going forward.

[Link to full planning post]

#FutureDebrief #MaritimeAnalysis #STAC
