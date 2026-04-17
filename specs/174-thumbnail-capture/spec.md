# Feature Specification: Thumbnail Capture and Gallery Preview

**Feature Branch**: `174-thumbnail-capture`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "[E08] Thumbnail capture and gallery preview — capture Leaflet map as PNG on Save, store as STAC thumbnail assets (800x600 large + 200x150 small), add gallery preview pane to catalog browser with prev/next navigation, Playwright backfill CLI script for regenerating all existing plot thumbnails."
**Epic**: E08 — STAC Browser Discovery UI
**Plan Reference**: `docs/thumbnail-capture-plan.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Save Plot Generates Thumbnails (Priority: P1)

As an analyst, when I save a plot after working on it, the system automatically captures the current map view as a thumbnail image. This means the next time I browse the catalog, I see a visual preview of that plot reflecting my latest changes — including track styling, basemap context, and current viewport.

**Why this priority**: Thumbnails are the foundation for all other stories. Without captured thumbnails, the gallery preview and list view images have nothing to display. The Save operation is the natural point to capture a representative snapshot of the plot.

**Independent Test**: Can be tested by saving a plot and verifying that two PNG files (large and small) appear in the STAC item directory with correct dimensions, and that the STAC item metadata references them as thumbnail assets.

**Acceptance Scenarios**:

1. **Given** a plot is open with visible tracks and basemap tiles, **When** the analyst saves the plot, **Then** a large thumbnail (800x600 PNG) and a small thumbnail (200x150 PNG) are written to the STAC item directory.
2. **Given** a plot is open, **When** the analyst saves, **Then** the STAC item metadata (`item.json`) is updated with two thumbnail asset entries using the standard STAC `"thumbnail"` role.
3. **Given** a plot with previously saved thumbnails, **When** the analyst saves again, **Then** the existing thumbnails are overwritten with fresh captures reflecting the current map state.
4. **Given** a plot is open but thumbnail capture fails (e.g., tiles not loaded), **When** the analyst saves, **Then** the session save itself still succeeds and a warning is logged. No corrupt or partial thumbnail files are written.

---

### User Story 2 — Gallery Preview in Catalog Browser (Priority: P2)

As an analyst browsing the catalog, I want to see a large thumbnail preview of the currently selected plot in a side panel, so I can visually assess each plot without opening it. I can arrow through filtered results to quickly scan for the plot I need or to spot data quality issues from recent imports.

**Why this priority**: This is the primary UX improvement the user requested. It provides the "next through filtered plots" browsing experience that motivates the entire feature. It depends on thumbnails existing (P1) to show meaningful content.

**Independent Test**: Can be tested by opening the catalog browser, clicking a plot item in the list, and verifying a large thumbnail appears in a preview pane. Navigate with prev/next controls and verify the preview updates. Falls back gracefully when no thumbnail exists.

**Acceptance Scenarios**:

1. **Given** the catalog browser is open and the analyst has a filtered list of plots, **When** the analyst clicks a plot in the list, **Then** a preview pane on the right shows the large thumbnail (800x600) for that plot along with its title and metadata.
2. **Given** the preview pane is showing a plot thumbnail, **When** the analyst clicks "next" or presses the right arrow key, **Then** the preview advances to the next item in the filtered list.
3. **Given** the preview pane is showing a plot thumbnail, **When** the analyst clicks "previous" or presses the left arrow key, **Then** the preview moves to the previous item in the filtered list.
4. **Given** the analyst is viewing the last item in the filtered list, **When** the analyst presses "next", **Then** navigation wraps to the first item (or the next button is disabled — either is acceptable).
5. **Given** a plot has no thumbnail captured yet, **When** the analyst selects it, **Then** the preview pane shows a fallback (the existing SVG spatial thumbnail or a "no preview available" placeholder).
6. **Given** the analyst wants to open a plot from the preview, **When** the analyst double-clicks the item in the list (existing behavior), **Then** the plot opens normally in the analysis view.

---

### User Story 3 — Small Thumbnails in List View (Priority: P3)

As an analyst scanning the exercise list, I want to see small raster thumbnail images (with basemap context) next to each plot entry, so I can quickly distinguish plots visually without relying solely on titles and metadata.

**Why this priority**: Enhances the existing list view with richer visual context. The current SVG spatial thumbnails show only track geometry; raster thumbnails add basemap context (land/sea) which aids recognition. Lower priority because the SVG thumbnails already provide some visual differentiation.

**Independent Test**: Can be tested by opening the catalog browser and verifying that list items with captured thumbnails display the small PNG image, while items without thumbnails fall back to the existing SVG spatial thumbnail.

**Acceptance Scenarios**:

1. **Given** a plot has a small thumbnail PNG stored, **When** the catalog list renders, **Then** the list item row displays the raster thumbnail image instead of the SVG spatial thumbnail.
2. **Given** a plot has no small thumbnail PNG, **When** the catalog list renders, **Then** the list item row falls back to the existing SVG spatial thumbnail.

---

### User Story 4 — Batch Thumbnail Backfill (Priority: P4)

As a maintainer or developer, I want to run a CLI command that opens every plot in the catalog, captures its map view as a thumbnail, and saves both sizes to disk. This allows me to populate thumbnails for all existing plots that were created before the Save-time capture was implemented.

**Why this priority**: This is a utility/tooling story needed for the initial rollout. Once Save-time capture is in place, new plots automatically get thumbnails. The backfill script handles the existing catalog. It runs locally (not in CI) and requires network access for basemap tiles.

**Independent Test**: Can be tested by running the CLI command against a catalog with multiple plots and verifying that every plot directory receives `thumbnail.png` and `thumbnail-sm.png` with correct dimensions, and that `item.json` is updated with thumbnail asset entries.

**Acceptance Scenarios**:

1. **Given** a catalog with multiple plots (some with thumbnails, some without), **When** the maintainer runs the backfill CLI command, **Then** all plots in the catalog receive fresh thumbnail images (existing thumbnails are overwritten).
2. **Given** the backfill script is running, **When** it processes each plot, **Then** it opens the plot, fits the view to all visible features, waits for basemap tiles to load, and captures the map view.
3. **Given** a plot fails to render during backfill (e.g., corrupt data), **When** the script encounters the error, **Then** it logs a warning and continues to the next plot without stopping.
4. **Given** the backfill script completes, **When** the maintainer opens the catalog browser, **Then** all plots show raster thumbnails in both the list view and preview pane.
5. **Given** the demo STAC catalog at `preview/workspace/samples/local-store/` contains ~70 sample plots imported before Save-time capture existed, **When** the maintainer runs the backfill script against that catalog as a one-off under this spec, **Then** every sample plot directory gains committed `thumbnail.png` + `thumbnail-sm.png` files and updated `item.json` asset entries, shipped as part of this feature.

---

### User Story 5 — STAC Data Model for Thumbnails (Priority: P1)

As a developer or service consumer, I need thumbnail images to be stored as standard STAC assets within the item directory, following the STAC `"thumbnail"` role convention, so that any STAC-aware client can discover and display them.

**Why this priority**: This is a foundational data model story — co-equal with P1. All other stories depend on the STAC item having a well-defined place to store and reference thumbnails. Without this, capture has nowhere to write and display has nothing to read.

**Independent Test**: Can be tested by creating a thumbnail via the storage function and verifying the resulting `item.json` contains correctly structured asset entries with the right roles, types, and hrefs.

**Acceptance Scenarios**:

1. **Given** a STAC item, **When** thumbnails are stored, **Then** `item.json` contains an asset with key `"thumbnail"`, role `["thumbnail"]`, type `"image/png"`, and href pointing to `./thumbnail.png`.
2. **Given** a STAC item, **When** thumbnails are stored, **Then** `item.json` also contains an asset with key `"thumbnail-sm"`, role `["thumbnail"]`, type `"image/png"`, and href pointing to `./thumbnail-sm.png`.
3. **Given** a STAC item with existing thumbnails, **When** new thumbnails are stored, **Then** the existing files and asset entries are overwritten (idempotent).

---

### Edge Cases

- What happens when the map has no visible features (empty plot)? The thumbnail captures whatever is visible — likely just the basemap at a default zoom. This is still useful as it shows the geographic area.
- What happens when basemap tiles fail to load during Save-time capture? The capture proceeds with whatever has rendered. If tiles are missing, the thumbnail may show a partial or blank basemap. A warning is logged but the save succeeds.
- What happens when the preview pane is open but the filter changes and the currently previewed item is no longer in the filtered set? The preview pane clears or switches to the first item in the updated filtered list.
- What happens when the catalog has zero plots? The preview pane shows an empty state. The backfill script exits cleanly with a message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST capture the current map view (including basemap tiles and track overlays) as a PNG image when the analyst saves a plot.
- **FR-002**: System MUST produce two thumbnail sizes from a single capture: large (800x600 pixels) and small (200x150 pixels).
- **FR-003**: System MUST store thumbnail PNG files inside the STAC item directory alongside `item.json`.
- **FR-004**: System MUST update STAC item metadata with thumbnail asset entries using the standard `"thumbnail"` role, `"image/png"` type, and relative href paths.
- **FR-005**: Thumbnail capture during Save MUST be non-blocking — if capture fails, the session save succeeds and a warning is logged.
- **FR-006**: The catalog browser MUST display a preview pane showing the large thumbnail for the currently selected plot.
- **FR-007**: The preview pane MUST support prev/next navigation through the filtered item set, via both on-screen controls and keyboard arrow keys.
- **FR-008**: The exercise list view MUST display the small raster thumbnail when available, falling back to the existing SVG spatial thumbnail when no PNG exists.
- **FR-009**: A CLI command MUST be provided to batch-generate thumbnails for all plots in the catalog.
- **FR-010**: The batch generation script MUST fit each plot to its visible features and wait for basemap tiles to load before capturing.
- **FR-011**: The batch generation script MUST continue processing remaining plots if an individual plot fails.
- **FR-012**: Thumbnail storage MUST be idempotent — re-saving or re-running the backfill overwrites existing thumbnails cleanly.
- **FR-013**: Thumbnails MUST include visible basemap tiles (land/sea context), not just track geometry.
- **FR-014**: As a one-off under this spec, the backfill script MUST be executed against the committed demo STAC catalog (`preview/workspace/samples/local-store/`), and the resulting `thumbnail.png`, `thumbnail-sm.png`, and updated `item.json` files MUST be committed to the repository so the deployed demo ships with populated thumbnails for all existing sample plots.

### Key Entities

- **Thumbnail (large)**: 800x600 PNG image capturing the rendered map view. Stored as `./thumbnail.png` in the STAC item directory. Referenced as a STAC asset with role `"thumbnail"`.
- **Thumbnail (small)**: 200x150 PNG image downscaled from the large thumbnail. Stored as `./thumbnail-sm.png`. Referenced as a STAC asset with role `"thumbnail"`.
- **STAC Item Asset**: Metadata entry in `item.json` with key, href, type, title, and roles. Follows the STAC specification for asset management.
- **Preview Pane**: A panel in the catalog browser layout showing the large thumbnail for the currently selected item, with navigation controls and metadata overlay.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Quickly scan and assess plots in the catalog without opening each one individually.
- **Key Decision(s)**:
  1. Which plot to open for detailed analysis (informed by seeing the large thumbnail preview)
  2. Whether imported data looks correct (spotting issues like missing tracks, wrong geographic area, or incorrect styling from the thumbnail)
- **Decision Inputs**: The large thumbnail provides geographic context (basemap + tracks), item title, metadata tags, date range, and vessel classes. Prev/next navigation allows rapid comparison.

### Screen Progression

| Step | Screen/State                   | User Action                          | Result                                                  |
| ---- | ------------------------------ | ------------------------------------ | ------------------------------------------------------- |
| 1    | Catalog list view              | Analyst opens catalog browser        | List of plots shown with small thumbnails               |
| 2    | List view with preview pane    | Analyst clicks a plot in the list    | Preview pane appears on right with large thumbnail      |
| 3    | Preview pane showing thumbnail | Analyst presses right arrow key      | Preview advances to next plot in filtered list           |
| 4    | Preview pane showing thumbnail | Analyst presses left arrow key       | Preview moves to previous plot                          |
| 5    | Found desired plot             | Analyst double-clicks item in list   | Plot opens in analysis view                             |
| 6    | Analysis view                  | Analyst modifies and saves plot      | Thumbnails captured and stored; visible on next catalog visit |

### UI States

- **Empty State**: Preview pane shows "Select a plot to preview" message when no item is selected, or "No preview available" with the SVG spatial thumbnail fallback when the selected item has no captured PNG thumbnail.
- **Loading State**: While the thumbnail image loads, a placeholder or spinner is shown in the preview pane. List view small thumbnails load lazily as rows scroll into view.
- **Error State**: If a thumbnail file is referenced in metadata but missing on disk, the preview pane falls back to the SVG spatial thumbnail with no error shown to the user.
- **Success State**: Large thumbnail displayed at full size in preview pane with item title, date range, and track/vessel metadata overlaid. Small thumbnails shown inline in list rows.

## Assumptions

- Basemap tiles (e.g., OpenStreetMap) support cross-origin image loading, enabling in-app canvas capture.
- The map view is rendered at sufficient size to produce a meaningful 800x600 capture. If the map panel is smaller, the capture will use the current rendered size.
- The backfill CLI script runs on a machine with network access to tile servers. It is not intended for CI environments.
- The existing GoldenLayout in the catalog browser can accommodate an additional panel for the preview pane without major restructuring.
- Single-click on a list item highlights/selects it (for preview); double-click opens the plot. This may require distinguishing click from double-click on the existing list rows.

## Dependencies

- Depends on completed E08 items: #125 (STAC extension + mock data), #129 (list view with spatial thumbnails)
- The gallery preview pane integrates into the StacBrowser GoldenLayout from #132 (three-view sync)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of plots saved after this feature is deployed have both thumbnail sizes stored in their STAC item directory.
- **SC-002**: Analysts can visually scan through 20 plots in under 60 seconds using the gallery preview pane and keyboard navigation.
- **SC-003**: The backfill CLI command successfully generates thumbnails for all plots in the catalog in a single run, with basemap tiles visible in every thumbnail.
- **SC-004**: Thumbnail capture adds no more than 2 seconds to the Save operation under normal conditions (tiles already cached).
- **SC-005**: All thumbnails include visible basemap context (land and sea boundaries), not just track geometry on a blank background.
- **SC-006**: The catalog list view displays raster thumbnails for items that have them, with seamless fallback to SVG thumbnails for items that don't.
- **SC-007**: After the one-off retro-capture, 100% of the ~70 sample plots in `preview/workspace/samples/local-store/` have both thumbnail sizes committed alongside `item.json`, verified by a count check in the PR evidence.
