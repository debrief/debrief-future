When analysts import legacy data, they sometimes encounter platform IDs that aren't yet in the registry. Until now, those gaps were invisible — data imported silently, metadata gaps remained hidden until downstream.

We've added validation to the import pipeline that checks each extracted platform ID against the registry. If a platform isn't registered, the result includes an advisory warning identifying which file introduced it. The import always succeeds — no blocking, no friction. Registry coverage gaps are now visible, actionable, and can be addressed at the analyst's convenience.

The feature just shipped with 17 passing tests (9 unit + 8 integration), zero regressions across 344 existing tests, and deduplication logic that keeps warning output concise even when hundreds of position records reference the same unregistered platform.

This is item 3 of 11 in E10 (NL-Assisted Catalog Discovery) — part of the larger effort to make the platform registry the single source of truth for vessel metadata across the import pipeline.

#FutureDebrief #MaritimeAnalysis #OpenSource
