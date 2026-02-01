We're converting FeatureList and LayersToolbar from raw HTML to vscrui components — the React library that matches VS Code's native UI.

The work eliminates 7 hardcoded colour values that bypass our token system and replaces browser media queries with ThemeProvider-controlled theme switching. Inline SVGs are being swapped for Codicon icons where platform equivalents exist (trash, eye, play, search), with custom SVG retained where no Codicon matches.

One interesting decision: the visibility filter (All / Hidden only / Visible only) is moving from radio buttons to a Dropdown. Dropdowns are the standard pattern in VS Code panels, so we're following platform conventions over web conventions.

The three-layer theming architecture (tokens.css → ThemeProvider → vsCodeAdapter) means vscrui components automatically pick up Light, Dark, and VS Code themes without additional wiring.

This conversion proves out patterns for radio groups, date-time inputs, icon buttons, and nested dropdowns that apply across the rest of the shared component library.

Planning notes: https://github.com/debrief/debrief-future/tree/main/specs/046-vscrui-conversion

#FutureDebrief #MaritimeAnalysis #OpenSource
