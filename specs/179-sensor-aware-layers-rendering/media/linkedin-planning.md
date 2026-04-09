Today, when an analyst imports a legacy REP file with sensor data, the Layers panel gives no visible proof the contacts actually loaded. The track shows up, the positions render, but whether the TOWED_ARRAY bearings made it through the importer is invisible unless you open the raw JSON. For a "did my data load correctly?" workflow, that's a silent failure in the first place anyone looks.

Next in the Future Debrief rebuild: expanding a sensor-bearing track will reveal grouping rows for Positions, Sensors, and Track Segments — with contact counts in parentheses, zero-padded bearings matching nautical convention, and individual contact rows you can click through. Pure in-memory rendering change, zero schema edits, one directory touched.

The planning post is up ahead of implementation — three open questions on selection semantics, consistency scope, and what to defer to a follow-up. Feedback welcome before the code gets written.

[BLOG_POST_URL]

#FutureDebrief #MaritimeAnalysis #OpenSource
