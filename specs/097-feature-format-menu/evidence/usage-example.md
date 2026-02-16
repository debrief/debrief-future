# Usage Example: Feature 097 - Feature Format Menu

## Single Feature Format Walkthrough

### Step 1: Open a Plot
Load a STAC plot containing at least one track feature in the VS Code extension.

### Step 2: Hover Over a Feature Row
In the Layers panel, hover over a track row (e.g., "HMS Alpha"). A pencil/edit icon appears on the right side of the row.

### Step 3: Click the Format Icon
Click the pencil icon. A cascading menu appears anchored to the icon position showing:
- **Line Colour** (with colour swatch submenu)
- **Line Weight** (with px presets)
- **Line Opacity** (with percentage presets)
- **Line Dash Array** (with pattern presets)
- **Point Shape** (with shape presets)
- **Point Fill Colour** (with colour swatch submenu)
- **Point Radius** (with px presets)

### Step 4: Select a Colour
Hover over "Line Colour" to open the colour submenu. The current colour shows a checkmark. Click "Red" (#CC0000).

### Step 5: Verify Map Update
The track immediately updates on the map:
- Line colour changes from default blue to red
- The FeatureRow colour indicator bar updates to red
- The `styleVersion` counter increments, triggering a MapView re-render

### Step 6: Verify Provenance
A provenance entry is recorded with:
```json
{
  "activity_type": "FORMAT_CHANGE",
  "parameters": {
    "featureIds": ["track-001"],
    "property": "line.color",
    "value": "#CC0000"
  },
  "previousValues": {
    "track-001": "#0000CC"
  }
}
```

## Batch Format Walkthrough

### Step 1: Select Multiple Features
Ctrl-click to select a track and a point location.

### Step 2: Click the Toolbar Format Button
The format (palette) button in the LayersToolbar becomes active. Click it.

### Step 3: Review Mixed-Type Menu
The menu shows the union of properties for both types:
- **Line Colour** — greyed out (not applicable to POINT)
- **Colour** — enabled (applies to both)
- **Weight** — enabled (applies to both)
- Greyed-out items show a tooltip explaining which types they don't apply to.

### Step 4: Apply Common Property
Select "Weight" > "3 px". Both features update their stroke weight.

## Per-Point Format Walkthrough

### Step 1: Expand a Track
Click the expand arrow on a track to reveal individual position rows.

### Step 2: Click Format on a Position
Click the pencil icon on position row index 5. The menu shows point-specific properties only.

### Step 3: Change Point Symbol
Select "Point Shape" > "Diamond". Only position 5 changes to diamond; other positions retain circles.

### Step 4: Apply Track-Level Change
Now click the format icon on the parent track and change line colour to green. Position 5 retains its diamond override while the track line turns green.
