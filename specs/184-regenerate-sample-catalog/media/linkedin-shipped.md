Before regeneration: 72 items carrying flat separate lists for nationality, vessel class, and track name. After: 73 items, zero flat lists, every item carrying structured per-platform records.

The sample catalog rebuild is done. One orchestration script -- stage source files, delete the old catalog, reimport, enrich -- produces 73 clean STAC items in under 5 seconds. The extra 10 items compared to the old catalog come from 5 standalone REP files that were sitting at the samples root and had never been imported. They're in now.

Two files fail to import (empty geometry, unsupported ELLIPSE feature kind -- pre-existing data quality issues). The script logs them, skips them, and continues. 73 items from 75 successful imports out of 77 attempted. 500 import warnings, 380 unregistered platform IDs logged for future registry work.

This was the data foundation the next four E10 features were waiting for -- CQL2 array filtering, filter bar chips, enum extraction, and natural language search over structured platform records. Those are next.

https://debrief.github.io/blog/shipped-regenerate-sample-catalog

#FutureDebrief #MaritimeAnalysis #STAC
