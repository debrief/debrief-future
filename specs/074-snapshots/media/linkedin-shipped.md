# LinkedIn Shipped Summary: Snapshots with Doubly-Linked Chain

Analysts can now capture a plot's state at any point in its timeline, not just the current view. Each snapshot saves clean GeoJSON as a STAC asset, stripped of all log entries, linked to previous snapshots through a doubly-linked chain in the metadata.

The interesting bit is lazy boundary detection. Each snapshot records how many provenance entries it contains, so the UI can show "Show earlier history (12 earlier operations)" without loading any files. Only when you click do we read from disk.

Cross-snapshot timeline assembly merges entries from multiple files, deduplicates by position hash, sorts chronologically. The analyst sees one continuous history even though it spans separate snapshots.

Write-then-link atomicity means a failed snapshot never corrupts the chain. Pure functions with dependency injection made testing straightforward. 86 tests passing, zero regressions.

Next up: the Log Panel (#072) that surfaces this to analysts.

[Read the full post](#)

#FutureDebrief #MaritimeAnalysis #Provenance
