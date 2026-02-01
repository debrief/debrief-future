Load REP track files and create a new plot in one action. No more creating empty plots first, then importing data — point at your files, choose a store, done.

This extends the REP import feature we shipped last month. The loader already handles parsing; now it can also set up the STAC scaffolding automatically. Fail-fast validation and atomic cleanup mean you either get a complete plot or a clear error, never a half-finished mess.

The main open question: if you select ten files and one is corrupted, should we fail entirely or create a plot with the nine valid ones? Curious what practitioners think.

Read the full planning post: https://debrief.github.io/[post-url]

#FutureDebrief #MaritimeAnalysis #OpenSource
