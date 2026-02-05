# LinkedIn Shipped Summary

Result files now persist when you reopen a plot.

Closing a plot in the old system meant losing any analysis results you'd created—calculations, visualizations, anything. The work was still in the STAC catalog, but invisible. Reopening the plot meant starting over.

We added extraction logic to stacService that reads results from STAC item assets and loads them into the attachments dropdown. The system identifies results using asset roles as the primary identifier, with fallback patterns for edge cases like manually-placed files. Deduplication logic prevents conflicts when merging persisted and runtime-created results.

This required rethinking how the UI discovers available data—it now queries the STAC catalog instead of relying only on what was created during the current session. Twenty-four unit tests cover the full pipeline.

→ [Read the full post](https://debrief.github.io/future/posts/shipped-load-result-attachments/)

#FutureDebrief #MaritimeAnalysis #STAC
