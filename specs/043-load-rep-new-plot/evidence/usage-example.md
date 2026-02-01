# Usage Example: Load REP Files into New Plot

## Scenario: Create new plot from a single REP file

1. Right-click `boat1.rep` in VS Code file explorer
2. Select **"Load into Debrief..."** from context menu
3. QuickPick shows:
   ```
   $(add) Add to new plot in "My Store"
   $(add) Add to new plot in "Project Store"
   ──────────────────────────────────
   $(graph) Exercise Alpha            01/15/2024
   $(graph) Training Run 1            01/10/2024
   ```
4. Select **"Add to new plot in 'My Store'"**
5. Input box appears: **"Enter plot title"**
6. Type: `Exercise Bravo` → press Enter
7. Progress notification: "Creating new plot from boat1.rep..."
8. Steps executed:
   - Parse `boat1.rep` via IoService
   - Create STAC Item `{uuid}/item.json` in My Store
   - Write merged GeoJSON to `{uuid}/{uuid}.geojson`
   - Copy `boat1.rep` to `{uuid}/assets/boat1.rep`
   - Register asset with `roles: ["source"]`
   - Compute bbox and temporal metadata
9. MapPanel opens with parsed track data
10. Info message: `Created plot "Exercise Bravo" with 2 feature(s)`

## Scenario: Create new plot from multiple REP files

1. Multi-select `boat1.rep` and `boat2.rep` in file explorer
2. Right-click → **"Load into Debrief..."**
3. Select **"Add to new plot in 'My Store'"**
4. Enter title: `Combined Exercise`
5. Both files parsed, features merged into single GeoJSON
6. Both original files copied to `{uuid}/assets/`
7. Plot opens with all tracks from both files

## Atomicity

If parsing succeeds but storing fails:
- The partially created `{uuid}/` folder is deleted
- Error message: "Failed to create plot: [error]. Cleaned up partial data."
- Original `.rep` files are never modified

## STAC Item Structure Created

```
my-store/
  catalog.json                    ← updated with new link
  {uuid}/
    item.json                     ← STAC Item metadata
    {uuid}.geojson                ← merged GeoJSON data
    assets/
      boat1.rep                   ← source file copy
      boat2.rep                   ← source file copy (if multi-file)
```
