# Discovery Report: Legacy Debrief Tool Migration

**Source Repository**: `debrief/debrief` (develop branch)
**Scan Date**: 2026-02-07
**Scanner**: Claude Code (automated scan + manual analysis)
**Total Tool-Bearing Classes Found**: 85
**Migrateable Tools**: 63
**Out of Scope**: 22

## Summary Table

| Category | Low | Medium | High | Total |
|----------|-----|--------|------|-------|
| track/styling | 2 | 1 | 0 | 3 |
| track/measurement | 12 | 5 | 2 | 19 |
| track/manipulation | 4 | 5 | 5 | 14 |
| track/analysis | 0 | 1 | 8 | 9 |
| sensor/calibration | 0 | 1 | 2 | 3 |
| sensor/analysis | 1 | 2 | 4 | 7 |
| dataset/export | 4 | 4 | 0 | 8 |
| narrative/formatting | 0 | 0 | 0 | 0 |
| **Total** | **23** | **19** | **21** | **63** |

## Identification Patterns Used

### Initial Patterns (Phase 1)
- Class names ending with: `Tool`, `Action`, `Analyzer`, `Calculator`, `Operation`
- Interfaces: `IAction`, `AbstractAction`, `IMenuCreator`
- Method signatures taking: `Layers`, `TrackWrapper`, `WatchableList`

### Expanded Patterns (Phase 2 — identified during discovery)
- `RightClickContextItemGenerator` — primary context-menu tool pattern in debrief.core
- `CMAPOperation` — undo-capable operation base class
- `CoreEditorAction` / `AbstractHandler` — toolbar/menu-bar actions
- `toteCalculation` — tote panel calculations (measurement tools)
- `PlainTool` — legacy toolbar tool base class
- `FilterOperation` — legacy filter/batch operations
- `CoreDragOperation` — drag-based track manipulation tools
- `zig_detector.*` — leg detection algorithm packages (no base class — found by package)
- `freq.*` — Doppler/frequency analysis packages (found by package)

### Cross-Reference Sources
- `plugin.xml` files for Eclipse command/handler registrations
- `ContextOperations/` package directory (all classes are tools)
- `Tools/Tote/Calculations/` directory (all classes are measurement tools)
- `Tools/FilterOperations/` directory (all classes are filter tools)

---

## Full Inventory

### track/styling

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| reformat-fixes | track/styling | Debrief.Tools.FilterOperations.ReformatFixes | Low | menu-bar | 1+ tracks | Yes (format options) | Reformat position fix display symbols and labels | Ready |
| hide-reveal-objects | track/styling | Debrief.Tools.FilterOperations.HideRevealObjects | Low | menu-bar | 1+ layers | Yes (object picker) | Toggle visibility of plot objects within time period | Ready |
| rainbow-shade-sonar-cuts | track/styling | org.mwc.debrief.core.ContextOperations.RainbowShadeSonarCuts | Medium | context-menu | 1 sensor | No | Colour-code sonar cuts by time using rainbow gradient | Ready |

### track/measurement

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| range-calc | track/measurement | Debrief.Tools.Tote.Calculations.rangeCalc | Low | auto/listener | 2 tracks (primary + secondary) | No | Calculate range (distance) between two tracks at current time | Ready |
| bearing-calc | track/measurement | Debrief.Tools.Tote.Calculations.bearingCalc | Low | auto/listener | 2 tracks | No | Calculate bearing from primary to secondary track | Ready |
| speed-calc | track/measurement | Debrief.Tools.Tote.Calculations.speedCalc | Low | auto/listener | 1 track | No | Calculate current speed of track | Ready |
| course-calc | track/measurement | Debrief.Tools.Tote.Calculations.courseCalc | Low | auto/listener | 1 track | No | Calculate current course of track | Ready |
| depth-calc | track/measurement | Debrief.Tools.Tote.Calculations.depthCalc | Low | auto/listener | 1 track | No | Calculate current depth of track | Ready |
| time-calc | track/measurement | Debrief.Tools.Tote.Calculations.timeCalc | Low | auto/listener | 1 track | No | Display current time for track position | Ready |
| rel-bearing-calc | track/measurement | Debrief.Tools.Tote.Calculations.relBearingCalc | Medium | auto/listener | 2 tracks | No | Calculate relative bearing between tracks | Ready |
| atb-calc | track/measurement | Debrief.Tools.Tote.Calculations.atbCalc | Medium | auto/listener | 2 tracks | No | Calculate angle-to-bow from ownship to target | Ready |
| bearing-rate-calc | track/measurement | Debrief.Tools.Tote.Calculations.bearingRateCalc | Medium | auto/listener | 2 tracks | No | Calculate rate of change of bearing | Ready |
| course-rate-calc | track/measurement | Debrief.Tools.Tote.Calculations.courseRateCalc | Medium | auto/listener | 1 track | No | Calculate rate of change of course | Ready |
| speed-rate-calc | track/measurement | Debrief.Tools.Tote.Calculations.speedRateCalc | Medium | auto/listener | 1 track | No | Calculate rate of change of speed (acceleration) | Ready |
| doppler-calc | track/measurement | Debrief.Tools.Tote.Calculations.dopplerCalc | Low | auto/listener | 2 tracks | No | Calculate Doppler frequency shift between tracks | Ready |
| delta-rate-calc | track/measurement | Debrief.Tools.Tote.Calculations.DeltaRateToteCalcImplementation | Low | auto/listener | 2 tracks | No | Calculate delta rate between tracks | Ready |
| course-delta-average-calc | track/measurement | Debrief.Tools.Tote.Calculations.courseDeltaAverageCalc | Low | auto/listener | 1 track | No | Calculate average course change over period | Ready |
| speed-delta-average-calc | track/measurement | Debrief.Tools.Tote.Calculations.speedDeltaAverageCalc | Low | auto/listener | 1 track | No | Calculate average speed change over period | Ready |
| course-delta-rate-rate-calc | track/measurement | Debrief.Tools.Tote.Calculations.courseDeltaRateRateCalc | High | auto/listener | 1 track | No | Calculate second derivative of course change | Ready |
| speed-rate-rate-calc | track/measurement | Debrief.Tools.Tote.Calculations.speedRateRateCalc | High | auto/listener | 1 track | No | Calculate second derivative of speed (jerk) | Ready |
| calculate-track-length | track/measurement | org.mwc.debrief.core.ContextOperations.CalculateTrackLength | Low | context-menu | 1+ tracks | No | Calculate total distance travelled along track | Ready |
| swt-range-calc | track/measurement | org.mwc.cmap.tote.calculations.SWTRangeCalc | Low | auto/listener | 2 tracks | No | SWT-based range calculation (tote panel) | Ready |

### track/manipulation

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| trim-track | track/manipulation | org.mwc.debrief.core.ContextOperations.TrimTrack | Medium | context-menu | 1 track + time period | No | Trim track to start/end within selected time period | Ready |
| interpolate-track | track/manipulation | org.mwc.debrief.core.ContextOperations.InterpolateTrack | Medium | context-menu | 1 track | Yes (interval input) | Interpolate positions at regular time intervals | Ready |
| merge-tracks | track/manipulation | org.mwc.debrief.core.ContextOperations.MergeTracks | Medium | context-menu | 2+ tracks | No | Merge multiple tracks into one (three variants: convert, in-place, standard) | Ready |
| group-tracks | track/manipulation | org.mwc.debrief.core.ContextOperations.GroupTracks | Low | context-menu | 2+ tracks | No | Group multiple tracks into a track group | Ready |
| group-lightweight-tracks | track/manipulation | org.mwc.debrief.core.ContextOperations.GroupLightweightTracks | Low | context-menu | 2+ lightweight tracks | No | Group lightweight tracks together | Ready |
| split-tracks-into-legs | track/manipulation | org.mwc.debrief.core.ContextOperations.SplitTracksIntoLegs | High | context-menu | 1 track | No | Split track into legs by time or spatially | Ready |
| smooth-track-jumps | track/manipulation | org.mwc.debrief.core.ContextOperations.SmoothTrackJumps | High | context-menu | 1 track | Yes (threshold input) | Smooth position jumps using interpolation | Ready |
| remove-track-jumps | track/manipulation | org.mwc.debrief.core.ContextOperations.RemoveTrackJumps | Medium | context-menu | 1 track | Yes (threshold input) | Remove position fixes that exceed jump threshold | Ready |
| set-time-zero | track/manipulation | Debrief.Tools.FilterOperations.SetTimeZero | Medium | menu-bar | 1+ tracks | Yes (time input) | Set reference time zero for relative time display | Ready |
| convert-absolute-tma-to-relative | track/manipulation | org.mwc.debrief.core.ContextOperations.ConvertAbsoluteTmaToRelative | High | context-menu | 1 TMA segment + ownship | No | Convert absolute TMA solution to relative bearing/range | Ready |
| convert-lightweight-to-track | track/manipulation | org.mwc.debrief.core.ContextOperations.ConvertLightweightTrackToTrack | Low | context-menu | 1 lightweight track | No | Convert lightweight track to full track | Ready |
| convert-track-to-lightweight | track/manipulation | org.mwc.debrief.core.ContextOperations.ConvertTrackToLightweightTrack | Low | context-menu | 1 track | No | Convert full track to lightweight track | Ready |
| generate-infill-segment | track/manipulation | org.mwc.debrief.core.ContextOperations.GenerateInfillSegment | High | context-menu | 2 track segments | No | Generate interpolated infill segment between two segments | Ready |
| generate-track | track/manipulation | org.mwc.debrief.core.ContextOperations.GenerateTrack | High | context-menu | Plot | Yes (track params) | Generate a new empty track with specified parameters | Ready |

### track/analysis

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| generate-tma-segment-from-cuts | track/analysis | org.mwc.debrief.core.ContextOperations.GenerateTMASegmentFromCuts | High | context-menu | Sensor cuts + ownship | Yes (TMA params) | Generate TMA solution segment from selected sensor cuts | Ready |
| generate-tma-from-ownship | track/analysis | org.mwc.debrief.core.ContextOperations.GenerateTMASegmentFromOwnshipPositions | High | context-menu | Ownship track + time period | No | Generate TMA segment using ownship positions as basis | Ready |
| generate-tma-from-infill | track/analysis | org.mwc.debrief.core.ContextOperations.GenerateTMASegmentFromInfillSegment | High | context-menu | Infill segment | No | Convert infill segment to TMA segment | Ready |
| generate-tuas-solution | track/analysis | org.mwc.debrief.core.ContextOperations.GenerateTUASolution | High | context-menu | Track + sensor data | Yes (TUAS params) | Generate TUAS (Target Under Aimpoint Solution) | Ready |
| generate-track-from-active-cuts | track/analysis | org.mwc.debrief.core.ContextOperations.GenerateTrackFromActiveCuts | High | context-menu | Active sensor cuts | No | Generate a track from active sensor cut positions | Ready |
| show-time-variable-plot | track/analysis | Debrief.Tools.FilterOperations.ShowTimeVariablePlot3 | High | menu-bar | 1+ tracks | Yes (variable picker) | Show time-variable analysis plot (range, bearing, speed over time) | Ready |
| zig-detector | track/analysis | org.mwc.debrief.track_shift.zig_detector.ZigDetector | High | view-action | Target track + ownship | No | Detect zig-zag manoeuvre patterns in target tracks | Ready |
| ownship-leg-detector | track/analysis | org.mwc.debrief.track_shift.zig_detector.ownship.OwnshipLegDetector | High | view-action | Ownship track | No | Detect steady-course legs in ownship track for TMA | Ready |
| xy-plot-generator | track/analysis | org.mwc.cmap.xyplot.XYPlotGeneratorButtons | Medium | context-menu | 1+ tracks or sensors | Yes (plot type picker) | Generate XY analysis plots from track/sensor data | Ready |

### sensor/calibration

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| resolve-ambiguity | sensor/calibration | org.mwc.debrief.track_shift.operations.ResolveAmbiguity | High | context-menu | Ambiguous sensor data | No | Resolve ambiguous bearing measurements (port/starboard) | Ready |
| ambiguity-resolver | sensor/calibration | org.mwc.debrief.track_shift.ambiguity.AmbiguityResolver | High | auto/listener | Sensor cuts with ambiguity | No | Algorithmic resolution of bearing ambiguity using leg analysis | Ready |
| delete-ambiguous-bearings | sensor/calibration | org.mwc.debrief.track_shift.views.BearingResidualsView (inner) | Medium | view-action | Bearing residuals view | No | Delete ambiguous bearing measurements from sensor data | Ready |

### sensor/analysis

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| generate-sensor-range-plot | sensor/analysis | org.mwc.debrief.core.ContextOperations.GenerateSensorRangePlot | High | context-menu | 1 sensor + ownship | No | Generate range plot from sensor bearing data | Ready |
| insert-sensor-arc | sensor/analysis | org.mwc.debrief.core.ContextOperations.GenerateNewInsertSensorArcAction | Medium | context-menu | 1 sensor | Yes (arc params) | Insert a new sensor arc (bearing/range fan) | Ready |
| doppler-curve | sensor/analysis | org.mwc.debrief.track_shift.freq.DopplerCurve | High | view-action | Frequency data | No | Calculate Doppler frequency curve for target motion analysis | Ready |
| inflection-point-detector | sensor/analysis | org.mwc.debrief.track_shift.freq.InflectionPointDetector | High | auto/listener | Frequency residuals | No | Detect inflection points in Doppler frequency data for CPA estimation | Ready |
| multipath-model | sensor/analysis | org.mwc.debrief.multipath2.model.MultiPathModel | High | view-action | Acoustic data + SVP | Yes (model params) | Multipath acoustic propagation model for range estimation | Needs Review |
| merge-contacts | sensor/analysis | org.mwc.debrief.core.ContextOperations.MergeContacts | Medium | context-menu | 2+ sensor contacts | No | Merge multiple sensor contacts from different sensors | Ready |
| generate-new-sensor-contact | sensor/analysis | org.mwc.debrief.core.ContextOperations.GenerateNewSensorContact | Low | context-menu | 1 sensor | Yes (contact params) | Create a new manual sensor contact entry | Ready |

### dataset/export

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| export-track-as-csv | dataset/export | org.mwc.debrief.core.ContextOperations.ExportTrackAsCSV | Low | context-menu | 1+ tracks | No | Export track positions as CSV file | Ready |
| copy-bearings-to-clipboard | dataset/export | org.mwc.debrief.core.ContextOperations.CopyBearingsToClipboard | Low | context-menu | 1 sensor | No | Copy sensor bearing data to clipboard in tabular format | Ready |
| export-track-to-gpx | dataset/export | org.mwc.debrief.core.operations.ExportTrackToGPX | Low | context-menu | 1+ tracks | No | Export track as GPX file for external tools | Ready |
| copy-time-data-to-clipboard | dataset/export | Debrief.Tools.FilterOperations.CopyTimeDataToClipboard | Low | menu-bar | 1+ tracks | No | Copy time-stamped position data to clipboard | Ready |
| paste-rep-clipboard | dataset/export | org.mwc.debrief.core.ContextOperations.GeneratePasteRepClipboard | Medium | context-menu | Clipboard content | No | Import track data from REP format on clipboard | Ready |
| export-wmf | dataset/export | org.mwc.cmap.plotViewer.actions.ExportWMF | Medium | toolbar-button | Plot | No | Export current plot view as Windows Metafile | Ready |
| export-rtf | dataset/export | org.mwc.cmap.plotViewer.actions.ExportRTF | Medium | toolbar-button | Plot | No | Export current plot view as Rich Text Format | Ready |
| export-as-geo-pdf | dataset/export | org.mwc.debrief.core.actions.ExportAsGeoPDFHandler | Medium | toolbar-button | Plot | Yes (PDF options) | Export plot as georeferenced PDF | Ready |

### drag-operations (track/manipulation — drag-drop trigger)

| Name | Category | Java Class | Complexity | Legacy Trigger | Selection Context | Has Intermediate UI | Description | Status |
|------|----------|------------|------------|----------------|-------------------|---------------------|-------------|--------|
| rotate-operation | track/manipulation | org.mwc.debrief.core.actions.drag.RotateDragMode.RotateOperation | High | drag-drop | 1 track segment | No | Rotate track segment around anchor point | Needs Review |
| stretch-operation | track/manipulation | org.mwc.debrief.core.actions.drag.StretchDragMode.StretchOperation | High | drag-drop | 1 track segment | No | Stretch/compress track segment length | Needs Review |
| shear-operation | track/manipulation | org.mwc.debrief.core.actions.drag.ShearDragMode.ShearOperation | High | drag-drop | 1 track segment | No | Shear track segment (skew transformation) | Needs Review |
| translate-operation | track/manipulation | org.mwc.debrief.core.actions.drag.TranslateOperation | Medium | drag-drop | 1 feature | No | Translate (move) a feature to new position | Needs Review |
| stretch-fan-operation | sensor/manipulation | org.mwc.debrief.core.actions.drag.StretchFanOperation | Medium | drag-drop | 1 sensor fan | No | Stretch/resize a sensor bearing fan | Needs Review |

---

## Trigger Type Summary

| Legacy Trigger | Count | Description |
|----------------|-------|-------------|
| context-menu | 30 | Right-click on selected item(s) |
| auto/listener | 19 | Automatically calculated when selection changes (tote) |
| menu-bar | 4 | Top-level menu item |
| toolbar-button | 3 | Toolbar button click |
| view-action | 5 | Button/action within a specialised view |
| drag-drop | 5 | Mouse drag on plot canvas |
| wizard | 0 | Multi-step dialog (none found as standalone) |
| property-edit | 0 | Edit in properties panel (handled by property framework) |
| key-binding | 0 | Keyboard shortcut (registered via plugin.xml, not tool classes) |
| bulk/batch | 0 | Applied to multiple items (typically wraps another trigger) |

**Note**: Several tools with "Yes (params)" in the Has Intermediate UI column gather parameters via a dialog before executing, but the dialog itself is not the tool — it's plumbing. The parameters gathered are documented per-tool.

## UX Integration Mapping

| Legacy Trigger | MCP/LLM Tool | VS Code Command | Webview Panel | Context Menu | Gap? |
|----------------|-------------|-----------------|---------------|--------------|------|
| context-menu | Yes | Yes | Possible | Yes | No |
| auto/listener | Yes | Yes (on selection change) | Yes (auto-refresh) | N/A | No |
| toolbar-button | Yes | Yes (command palette) | Yes (toolbar) | N/A | No |
| menu-bar | Yes | Yes (command palette) | N/A | N/A | No |
| view-action | Yes | Possible | Yes (embedded) | N/A | No |
| drag-drop | No (not interactive) | No | **Yes (webview only)** | No | **Partial** |
| wizard | Partial (multi-turn) | Partial (quick pick) | **Yes (form panel)** | No | **Partial** |
| property-edit | Partial | Partial (settings) | Yes (form) | N/A | No |
| key-binding | N/A | Yes (keybinding) | Possible | N/A | No |
| bulk/batch | Yes | Yes (multi-select) | Yes | N/A | No |

## Tools Requiring New UX Mechanisms

### Drag-Drop Tools (5 tools)

The following tools use drag-drop interaction on the plot canvas. In Future Debrief, the webview map panel could support drag interactions, but MCP/LLM and VS Code commands cannot.

| Tool | Current Trigger | Proposed Alternative |
|------|----------------|---------------------|
| rotate-operation | drag-drop | Webview: drag handle on map; MCP: specify angle parameter |
| stretch-operation | drag-drop | Webview: drag endpoint on map; MCP: specify scale factor |
| shear-operation | drag-drop | Webview: drag corner on map; MCP: specify shear angle |
| translate-operation | drag-drop | Webview: drag feature on map; MCP: specify offset vector |
| stretch-fan-operation | drag-drop | Webview: drag fan edge on map; MCP: specify new arc extent |

**Recommendation**: These tools should be split into two implementations:
1. **Parameter-based**: Accept explicit values (angle, scale, offset) for MCP/LLM invocation
2. **Interactive**: Use webview drag handles for manual manipulation

### Wizard-Based Tools (0 standalone wizards found)

No standalone wizard tools were found. The `DopplerPlotWizard` in `org.mwc.cmap.xyplot` is a plot configuration wizard, not a data manipulation tool. Several tools gather parameters via intermediate UI dialogs, but these are single-step (not multi-step wizards).

---

## Tools by Status

### Ready for Migration (58 tools)

All tools listed in the Full Inventory above with Status = Ready, grouped by complexity:

**Low Complexity (23 tools)**:
- track/styling: reformat-fixes, hide-reveal-objects
- track/measurement: range-calc, bearing-calc, speed-calc, course-calc, depth-calc, time-calc, doppler-calc, delta-rate-calc, course-delta-average-calc, speed-delta-average-calc, calculate-track-length, swt-range-calc
- track/manipulation: group-tracks, group-lightweight-tracks, convert-lightweight-to-track, convert-track-to-lightweight
- sensor/analysis: generate-new-sensor-contact
- dataset/export: export-track-as-csv, copy-bearings-to-clipboard, export-track-to-gpx, copy-time-data-to-clipboard

**Medium Complexity (19 tools)**:
- track/styling: rainbow-shade-sonar-cuts
- track/measurement: rel-bearing-calc, atb-calc, bearing-rate-calc, course-rate-calc, speed-rate-calc
- track/manipulation: trim-track, interpolate-track, merge-tracks, remove-track-jumps, set-time-zero
- track/analysis: xy-plot-generator
- sensor/calibration: delete-ambiguous-bearings
- sensor/analysis: insert-sensor-arc, merge-contacts
- dataset/export: paste-rep-clipboard, export-wmf, export-rtf, export-as-geo-pdf

**High Complexity (16 tools)**:
- track/measurement: course-delta-rate-rate-calc, speed-rate-rate-calc
- track/manipulation: split-tracks-into-legs, smooth-track-jumps, convert-absolute-tma-to-relative, generate-infill-segment, generate-track
- track/analysis: generate-tma-segment-from-cuts, generate-tma-from-ownship, generate-tma-from-infill, generate-tuas-solution, generate-track-from-active-cuts, show-time-variable-plot, zig-detector, ownship-leg-detector
- sensor/analysis: generate-sensor-range-plot

### Needs Review (5 tools)

| Tool | Reason |
|------|--------|
| rotate-operation | Drag-drop trigger needs new UX mechanism; geometric algorithm needs careful extraction |
| stretch-operation | Drag-drop trigger needs new UX mechanism |
| shear-operation | Drag-drop trigger needs new UX mechanism |
| translate-operation | Drag-drop trigger needs new UX mechanism; simpler algorithm |
| stretch-fan-operation | Drag-drop trigger needs new UX mechanism; sensor-specific geometry |
| multipath-model | Heavy external dependency (SVP data, acoustic propagation); tightly coupled to MultiPathView |

### Out of Scope (22 classes)

| Class | Reason |
|-------|--------|
| Undo / Redo | Pure undo/redo plumbing |
| OpenPlot / OpenPlotXML | Session management |
| SavePlot / SavePlotAs / SavePlotXML / SavePlotAsXML | Session management |
| NewSession / CloseSession / ExitApplication | Session management |
| ImportData2 / ImportRangeData | File import — belongs to debrief-io |
| OpenDebriefTutorialAction | Tutorial launcher |
| CreateProjectHandler | Project creation |
| RadioHandler / OpenPrefs | UI preferences |
| InsertTrackStore / ExportToCloud / ConvertToDebriefTrack | GND Manager specific |
| AcknowledgementHandler | Help dialog |
| DISRunInSimulatorHandler | DIS simulation specific |
| ImportDatabase (pepys) | Database import specific |
| DebriefWriteVRML | Obsolete format |
| CreateShape / CreateLabel / CreateBuoyPattern | Shape palette — creation UI, not analysis tools |
| CoreInsertChartFeature | Chart feature insertion UI plumbing |
| SelectionOperation (PlotOutlinePage inner) | UI selection plumbing |
| WrapDebriefAction | Loader action wrapper |
| DragFeatureAction / DragComponentAction | Low-level drag event wrappers (delegate to operations) |

---

## Additional Patterns Discovered

The following patterns were identified during the scan that were NOT in the initial identification set:

1. **`RightClickContextItemGenerator`** — The primary pattern for context-menu tools in `org.mwc.debrief.core`. Every class in `ContextOperations/` implements this interface.
2. **`CMAPOperation`** — Base class for undo-capable operations. The actual algorithmic code is in the `execute()` method of these inner operation classes.
3. **`toteCalculation`** — Interface for tote panel calculations. All classes in `Debrief/Tools/Tote/Calculations/` implement this.
4. **`CoreDragOperation`** — Base class for drag-based manipulation in `org.mwc.debrief.core.actions.drag/`.
5. **Package-based discovery** — `zig_detector/`, `freq/`, `ambiguity/`, `multipath2/model/` packages contain algorithmic classes that don't extend any tool base class but contain important algorithms.
6. **Inner class pattern** — Many context operations have their algorithmic logic in a `private static class XxxOperation extends CMAPOperation` inner class. The outer class handles the menu contribution; the inner class has the algorithm.
7. **`FilterOperation`** abstract class in legacy — Used by `SetTimeZero`, `ReformatFixes`, `HideRevealObjects`, `CopyTimeDataToClipboard`, `ShowTimeVariablePlot3`.
8. **View-embedded algorithms** — `BaseStackedDotsView`, `BearingResidualsView`, `FrequencyResidualsView`, `SensorFusionView` contain analysis algorithms embedded in view classes. The algorithms need extraction from the UI code.

---

## Statistics

| Metric | Count |
|--------|-------|
| Total Java classes scanned | ~500+ |
| Classes matching initial patterns | 85 |
| Expanded pattern additions | 12 |
| Migrateable tools (Ready) | 58 |
| Needs Review | 5 |
| Out of Scope | 22 |
| Categories used | 8 (narrative/formatting empty) |
| Legacy trigger types observed | 6 of 10 |
| Tools with intermediate UI | 14 |
| Already migrated (in debrief-future) | 4 (track/styling) |
| Net new tools to migrate | 59 (58 Ready + some Needs Review will become Ready) |
