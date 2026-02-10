# Data Model: Fix VS Code Extension Bugs

**Feature**: 077-fix-vscode-extension-bugs
**Date**: 2026-02-10

## Data Flow: Time Slider to Map Rendering

This bug fix does not change any data models. It fixes a type mismatch in the data flow between two existing layers.

### Current Flow (broken)

```
STAC/GeoJSON          Track type            trackToFeature()     temporal-utils
─────────────         ──────────            ────────────────     ──────────────
times: string[]  →    times: string[]  →    times: string[]  →  expects number[]
(ISO 8601)            (ISO 8601)            (PASSTHROUGH)        (epoch ms)
                                                                  ↓
                                                            SILENT FAILURE
                                                            (string vs number
                                                             comparison)
```

### Fixed Flow

```
STAC/GeoJSON          Track type            trackToFeature()     temporal-utils
─────────────         ──────────            ────────────────     ──────────────
times: string[]  →    times: string[]  →    times: number[]  →  expects number[]
(ISO 8601)            (ISO 8601)            (CONVERTED)          (epoch ms)
                                            via .map(t =>         ↓
                                            new Date(t)         WORKS CORRECTLY
                                            .getTime())         (binary search,
                                                                 slicing)
```

### Key Types (unchanged)

| Type | Location | `times` field | Notes |
|------|----------|--------------|-------|
| `Track` | `apps/vscode/src/types/plot.ts:116` | `string[]` | ISO 8601 — unchanged |
| `DebriefFeature.properties.times` | Runtime (GeoJSON) | `number[]` expected | Epoch ms — conversion happens in `trackToFeature()` |
| `TemporalTrackData.timestamps` | `shared/components/src/MapView/temporal-utils.ts:18` | `number[]` | Epoch ms — unchanged |
| `TimeInstant.epoch` | `services/session-state/src/types/temporal.ts:10` | `number` | Epoch ms — unchanged |

### Data Flow: Selection to Tool Offering

```
Map Webview             MapPanel              Session Store       ToolMatchAdapter
───────────             ────────              ─────────────       ────────────────
selectionChanged  →     onSelectionChanged    setSelection()  →   updateSelection()
(trackIds,              callback              (featureIds)        featureIdsToSelection()
 locationIds)           (REGISTERED ONCE)                         getFeatureKind()
                         ↓                                         ↓
                   FIX: Re-register                          getActiveTools()
                   for reused panels                              ↓
                                                            toolsTreeProvider.refresh()
```

## Entities (no changes)

No data model entities are created, modified, or removed by this bug fix. All changes are in the data transformation/conversion layer.
