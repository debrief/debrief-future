# [E08] List view with spatial thumbnails

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Analysts need a scrollable list of matching exercises showing key metadata at a glance, including spatial thumbnails for quick visual recognition. The list must also support the "Continue Recent Work" flow (70% of sessions).

## Proposed Solution
1. Scrollable list view showing exercise name/title, metadata summary (vessel classes, tags, author, duration), date/temporal summary
2. Spatial thumbnail per exercise — sufficient for visual recognition of track patterns
3. Flexible sorting: recency, alphabetical, duration (extensible sort model)
4. Prominent "recently opened" section for one-click resumption of prior work
5. Selecting an exercise opens it in a new editor tab (Stack Browser stays open)

## Success Criteria
- List displays all matching exercises with metadata and spatial thumbnails
- Thumbnails visually distinguish different exercise track patterns
- Sorting works for all dimensions (recency, alphabetical, duration)
- Recently opened exercises prominently accessible
- Exercise selection opens in new editor tab
- "No matches" displayed when filter yields zero results

## Dependencies
Requires #125 (STAC Extension spec + mock data fixtures)

## Complexity
Medium
