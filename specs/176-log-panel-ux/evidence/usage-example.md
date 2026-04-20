# Usage Example: Analysis Log Panel — Rich Card UX

## Host Integration

The LogPanel component is rendered inside the VS Code extension webview
and the web-shell preview app. Hosts wire it up by passing a projected
`TimelineEntry[]` plus an optional `featureNames` map:

```tsx
import { LogPanel } from '@debrief/components';
import type { TimelineEntry, ViewMode } from '@debrief/components';
import { DEFAULT_FILTER_STATE } from '@debrief/components';
import { useState } from 'react';

export function HostShell({ entries, featureNames }: {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState(DEFAULT_FILTER_STATE);

  return (
    <LogPanel
      entries={entries}
      featureNames={featureNames}
      viewMode={viewMode}
      selectedEntryId={selectedEntryId}
      filterState={filterState}
      hasActiveSession={true}
      plotName="Exercise Alpha"
      onViewModeChange={setViewMode}
      onFilterStateChange={setFilterState}
      onSelectedEntryChange={setSelectedEntryId}
    />
  );
}
```

## Sample Timeline

The Storybook `AllCategories` story renders the following six entries
(newest first in the Timeline view):

```json
[
  {
    "activity_id": "cat-unknown",
    "timestamp": "2026-04-19T09:05:00Z",
    "toolName": "custom-unknown-tool",
    "tool_version": "0.0.1",
    "parameters": { "note": { "value": "fallback", "default": false } },
    "usedFeatureIds": ["track-alpha"],
    "execution_duration": "PT0.2S"
  },
  {
    "activity_id": "cat-snapshot",
    "timestamp": "2026-04-19T09:04:00Z",
    "toolName": "export-png",
    "tool_version": "1.0.0",
    "parameters": {},
    "usedFeatureIds": ["track-alpha"],
    "execution_duration": "PT0.4S"
  },
  {
    "activity_id": "cat-filter",
    "timestamp": "2026-04-19T09:03:00Z",
    "toolName": "time-filter",
    "tool_version": "1.0.0",
    "parameters": { "mode": { "value": "include", "default": false } },
    "usedFeatureIds": ["track-alpha"],
    "execution_duration": "PT0.05S"
  },
  {
    "activity_id": "cat-calc",
    "timestamp": "2026-04-19T09:02:00Z",
    "toolName": "bearing-between-tracks",
    "tool_version": "1.2.0",
    "parameters": { "maxRange": { "value": 5000, "default": false } },
    "usedFeatureIds": ["track-alpha", "track-bravo"],
    "execution_duration": "PT2.3S"
  },
  {
    "activity_id": "cat-style",
    "timestamp": "2026-04-19T09:01:00Z",
    "toolName": "change-color",
    "tool_version": "1.0.0",
    "parameters": { "color": { "value": "#e11d48", "default": false } },
    "usedFeatureIds": ["track-alpha"],
    "execution_duration": "PT0.1S"
  },
  {
    "activity_id": "cat-import",
    "timestamp": "2026-04-19T09:00:00Z",
    "toolName": "import-rep",
    "tool_version": "1.0.0",
    "parameters": { "file": { "value": "alpha.rep", "default": false } },
    "usedFeatureIds": [],
    "execution_duration": "PT1.2S"
  }
]
```

## Expected Rendering

With the above timeline fed into the panel:

| # | Category icon | Tool name | Track badges | Timestamp | Duration | Param chips |
|---|---------------|-----------|--------------|-----------|----------|-------------|
| 6 | Grey square (fallback) | `custom-unknown-tool` | `track-alpha` | `09:05:00 UTC` | `200ms` | `≡ note: fallback ●` |
| 5 | Yellow camera (snapshot) | `export-png` | `track-alpha` | `09:04:00 UTC` | *(hidden)* | *Manual checkpoint* |
| 4 | Orange filter (filter) | `time-filter` | `track-alpha` | `09:03:00 UTC` | `50ms` | `≡ mode: include ●` |
| 3 | Green sine (calc) | `bearing-between-tracks` | `track-alpha`, `track-bravo` | `09:02:00 UTC` | `2.3s` | `# maxRange: 5000 ●` |
| 2 | Violet palette (style) | `change-color` | `track-alpha` | `09:01:00 UTC` | `100ms` | `█ color: #e11d48 ●` |
| 1 | Blue arrow (import) | `import-rep` | *(none)* | `09:00:00 UTC` | `1.2s` | `≡ file: alpha.rep ●` |

The card anatomy for every row is the same three stacked rows:

```
┌─────────────────────────────────────────────────────┐
│ [step] [icon] tool-name  [💬]  [tune/deleted badges] │  ← Header
├─────────────────────────────────────────────────────┤
│ (track badges…)           09:02:00 UTC   2.3s       │  ← Meta
├─────────────────────────────────────────────────────┤
│ [# maxRange: 5000 ●] [# speed: 12]  [+N more]       │  ← Params
└─────────────────────────────────────────────────────┘
```

## View Mode Switching

The 4-tab ARIA tablist at the top of the panel switches the rendering:

- **Timeline** — all rows as rich cards, newest first.
- **By Feature** — cards regrouped under track-name headers.
- **Compact** — cards shrink to header + meta only (no params row).
- **Detailed** — cards expand to show `used[]` + `generated[]` feature
  lists and the `generated_result_id`.

Keyboard: with focus on any tab, `ArrowLeft` / `ArrowRight` cycle
through adjacent tabs (with wrap); `Home` and `End` jump to the first
or last tab; only the active tab has `tabIndex={0}` (roving).
