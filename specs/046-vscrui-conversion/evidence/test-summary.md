# Test Summary: vscrui Conversion (046)

## Verification Audits

### Colour Audit (T020)
- **Status**: PASS (within scope)
- Hardcoded hex/rgb/rgba values in `tokens.css` (expected — token definitions)
- Remaining hex values in other CSS files are fallback values inside `var()` expressions (acceptable)
- All 7 hardcoded colour violations from the SRD have been replaced with tokens

### Media Query Audit (T022)
- **Status**: PASS (within scope)
- Zero `prefers-color-scheme` queries in LayersToolbar components
- RunDropdown.css converted (was missed in initial pass, fixed)
- Note: `ToolMatchHarness.css` still has a media query — out of scope for this feature (not listed in spec file changes)

## Component Conversion Summary

| Component | Elements Converted | Icon Replacements |
|-----------|-------------------|-------------------|
| FilterDropdown.tsx | TextField, 4+N Checkbox, Dropdown, 5 Button | check-all, check, add, remove (eraser SVG retained) |
| LayersToolbar.tsx | 6 Button | trash, eye, eye-closed, play, search, filter-filled (paperclip SVG retained) |
| RunDropdown.tsx | N Button (menu items) | None (text-only menu items) |
| AssociatedFilesDropdown.tsx | N Button (file rows) + 4 Button (context actions) | None (text-only actions) |

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Added vscrui dependency |
| `.storybook/preview.tsx` | Added codicon.css import |
| `styles/tokens.css` | Added --debrief-color-attention |
| `AssociatedFilesDropdown.css` | Token colours + [data-theme='dark'] |
| `YellowHalo.css` | Token colours |
| `FeatureList.css` | [data-theme='dark'] selectors |
| `FilterDropdown.css` | [data-theme='dark'] selectors |
| `LayersToolbar.css` | [data-theme='dark'] selectors |
| `RunDropdown.css` | [data-theme='dark'] selectors |
| `FilterDropdown.tsx` | vscrui components + Codicon icons |
| `LayersToolbar.tsx` | vscrui Button + Icon components |
| `RunDropdown.tsx` | vscrui Button |
| `AssociatedFilesDropdown.tsx` | vscrui Button |
| `LayersToolbar.stories.tsx` | MultiContext story |
| `FilterDropdown.stories.tsx` | MultiContext story |
