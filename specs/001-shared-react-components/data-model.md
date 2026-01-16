# Data Model: Shared React Component Library

**Feature**: 001-shared-react-components
**Date**: 2026-01-16
**Source**: Feature specification + research decisions

## Overview

This document defines the TypeScript interfaces for the shared React component library. All components accept GeoJSON data as their primary input and communicate user interactions through callbacks.

## Core Data Types

### GeoJSON Extensions

Components work with standard GeoJSON extended with Debrief-specific properties:

```typescript
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

/**
 * Feature type classification for rendering and filtering
 */
type FeatureType = 'track' | 'reference' | 'analysis' | 'unknown';

/**
 * Properties attached to Debrief features
 * Derived from LinkML schema definitions
 */
interface DebriefFeatureProperties {
  /** Display name for the feature */
  name?: string;

  /** Feature classification */
  type?: FeatureType;

  /** ISO 8601 start time (for temporal features) */
  startTime?: string;

  /** ISO 8601 end time (for temporal features) */
  endTime?: string;

  /** Platform identifier (for tracks) */
  platform?: string;

  /** Source file provenance */
  source?: string;

  /** Additional metadata (schema-extensible) */
  [key: string]: unknown;
}

/**
 * A GeoJSON Feature with Debrief-specific properties
 */
type DebriefFeature = Feature<Geometry, DebriefFeatureProperties>;

/**
 * A collection of Debrief features
 */
type DebriefFeatureCollection = FeatureCollection<Geometry, DebriefFeatureProperties>;
```

### Selection State

Selection is managed externally and passed to components:

```typescript
/**
 * Set of selected feature IDs
 * Components receive this as a prop and call onSelect to request changes
 */
type SelectionState = Set<string>;

/**
 * Selection change handler signature
 */
type SelectionHandler = (selectedIds: Set<string>) => void;
```

### Theme Configuration

Theme tokens are defined as CSS custom properties:

```typescript
/**
 * Theme token values that can be customized
 */
interface ThemeTokens {
  /** Primary brand color */
  primary: string;

  /** Background surface color */
  surface: string;

  /** Primary text color */
  text: string;

  /** Secondary/muted text color */
  textMuted: string;

  /** Border color */
  border: string;

  /** Default track color */
  trackColor: string;

  /** Reference point color */
  referenceColor: string;

  /** Analysis result color */
  analysisColor: string;

  /** Selection highlight color */
  selectionColor: string;

  /** Error state color */
  error: string;

  /** Base spacing unit (px) */
  spacingUnit: number;

  /** Border radius (px) */
  borderRadius: number;

  /** Font family */
  fontFamily: string;
}
```

## Component Interfaces

### MapView

The primary map visualization component:

```typescript
interface MapViewProps {
  /** GeoJSON features to display */
  features: DebriefFeatureCollection;

  /** Currently selected feature IDs */
  selectedIds?: Set<string>;

  /** Called when user selects/deselects features */
  onSelect?: SelectionHandler;

  /** Called when map viewport changes */
  onViewportChange?: (viewport: MapViewport) => void;

  /** Initial map center [lat, lng] */
  initialCenter?: [number, number];

  /** Initial zoom level (0-18) */
  initialZoom?: number;

  /** Whether selection is enabled */
  selectionEnabled?: boolean;

  /** Tile layer URL template (for custom/offline tiles) */
  tileUrl?: string;

  /** Tile layer attribution text */
  tileAttribution?: string;

  /** Custom className for container */
  className?: string;

  /** Inline styles for container */
  style?: React.CSSProperties;
}

interface MapViewport {
  /** Center coordinates [lat, lng] */
  center: [number, number];

  /** Zoom level */
  zoom: number;

  /** Visible bounds [[south, west], [north, east]] */
  bounds: [[number, number], [number, number]];
}
```

### Timeline

Temporal visualization component:

```typescript
interface TimelineProps {
  /** GeoJSON features with temporal data */
  features: DebriefFeatureCollection;

  /** Currently selected feature IDs */
  selectedIds?: Set<string>;

  /** Called when user selects/deselects features */
  onSelect?: SelectionHandler;

  /** Called when visible time range changes */
  onTimeRangeChange?: (range: TimeRange) => void;

  /** Initial visible time range */
  initialTimeRange?: TimeRange;

  /** Whether selection is enabled */
  selectionEnabled?: boolean;

  /** Orientation of the timeline */
  orientation?: 'horizontal' | 'vertical';

  /** Custom className for container */
  className?: string;

  /** Inline styles for container */
  style?: React.CSSProperties;
}

interface TimeRange {
  /** Start of visible range (ISO 8601 or Date) */
  start: string | Date;

  /** End of visible range (ISO 8601 or Date) */
  end: string | Date;
}
```

### FeatureList

Scrollable list of features:

```typescript
interface FeatureListProps {
  /** GeoJSON features to display */
  features: DebriefFeatureCollection;

  /** Currently selected feature IDs */
  selectedIds?: Set<string>;

  /** Called when user selects/deselects features */
  onSelect?: SelectionHandler;

  /** Called when user double-clicks a feature */
  onFeatureDoubleClick?: (featureId: string) => void;

  /** Whether selection is enabled */
  selectionEnabled?: boolean;

  /** Whether multi-select is allowed */
  multiSelect?: boolean;

  /** Sort order for features */
  sortBy?: 'name' | 'type' | 'startTime';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Filter predicate */
  filter?: (feature: DebriefFeature) => boolean;

  /** Custom row renderer */
  renderRow?: (feature: DebriefFeature, isSelected: boolean) => React.ReactNode;

  /** Custom className for container */
  className?: string;

  /** Inline styles for container */
  style?: React.CSSProperties;
}
```

### ThemeProvider

Theme context provider:

```typescript
interface ThemeProviderProps {
  /** Partial theme overrides */
  theme?: Partial<ThemeTokens>;

  /** Children to render */
  children: React.ReactNode;
}
```

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Consumer Application                          │
│  (Electron Loader / VS Code Extension)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ provides
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ThemeProvider                                 │
│  - Sets CSS custom properties                                    │
│  - Provides theme context                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ wraps
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Selection State                               │
│  - Set<string> of selected feature IDs                          │
│  - Managed by consumer                                           │
│  - Passed to all components                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ MapView  │  │ Timeline │  │FeatureList│
         │          │  │          │  │          │
         │ Leaflet  │  │ Canvas   │  │ Virtual  │
         │ rendering│  │ rendering│  │ list     │
         └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                              │ consumes
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                DebriefFeatureCollection                          │
│  - Standard GeoJSON structure                                    │
│  - Extended with Debrief properties                              │
│  - Single source of truth for display                            │
└─────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Selection State Machine

```
┌─────────────┐
│   Empty     │◄────────────────┐
│ (no items)  │                 │
└──────┬──────┘                 │
       │                        │
       │ click feature          │ click empty / clear
       ▼                        │
┌─────────────┐                 │
│   Single    │─────────────────┤
│ (one item)  │                 │
└──────┬──────┘                 │
       │                        │
       │ ctrl+click (multiSelect)
       ▼                        │
┌─────────────┐                 │
│  Multiple   │─────────────────┘
│ (n items)   │
└─────────────┘
```

### MapView Interaction States

```
┌─────────────┐
│    Idle     │◄──────────────────┐
│             │                   │
└──────┬──────┘                   │
       │                          │
       │ mousedown on map         │ mouseup / click
       ▼                          │
┌─────────────┐                   │
│   Panning   │───────────────────┤
│             │                   │
└─────────────┘                   │
                                  │
       │ scroll wheel             │ scroll end
       ▼                          │
┌─────────────┐                   │
│  Zooming    │───────────────────┘
│             │
└─────────────┘
```

## Validation Rules

### Feature Properties

| Property | Required | Format | Validation |
|----------|----------|--------|------------|
| id | Yes | string | Must be unique within collection |
| name | No | string | Max 255 characters |
| type | No | enum | 'track' \| 'reference' \| 'analysis' |
| startTime | No | ISO 8601 | Valid date string |
| endTime | No | ISO 8601 | Must be >= startTime if both present |

### Component Props

| Component | Prop | Validation |
|-----------|------|------------|
| MapView | initialZoom | 0-18 inclusive |
| MapView | initialCenter | Valid lat/lng coordinates |
| Timeline | initialTimeRange | start <= end |
| FeatureList | sortBy | Valid sort key |

## Error Handling

Components handle malformed data gracefully (FR-011):

| Scenario | Behavior |
|----------|----------|
| Missing feature ID | Generate temporary ID, log warning |
| Invalid geometry | Skip feature, log warning |
| Missing name property | Display "Unnamed [type]" |
| Invalid time format | Exclude from timeline, show in list |
| Empty FeatureCollection | Render empty state (no error) |
