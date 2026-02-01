# Usage Example: vscrui Conversion

## Before (raw HTML)

```tsx
// LayersToolbar.tsx — toolbar button
<button
  className="debrief-layers-toolbar__btn"
  disabled={!hasSelection}
  onClick={() => onDelete?.(selectedFeatureIds)}
  title="Delete"
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.5 1h5a.5.5 0 0 1 ..." />
  </svg>
</button>

// FilterDropdown.tsx — search input
<input
  type="text"
  className="debrief-filter-dropdown__search"
  placeholder="Search features..."
  value={localQuery}
  onChange={(e) => handleTextChange(e.target.value)}
/>

// FilterDropdown.tsx — checkbox
<label className="debrief-filter-dropdown__checkbox">
  <input type="checkbox" checked={filterState.searchScope.name} onChange={...} />
  Name
</label>

// FilterDropdown.tsx — radio group
<label><input type="radio" name="visibility" value="all" checked={...} /> All</label>
<label><input type="radio" name="visibility" value="hidden-only" checked={...} /> Hidden only</label>
<label><input type="radio" name="visibility" value="visible-only" checked={...} /> Visible only</label>
```

## After (vscrui components)

```tsx
// LayersToolbar.tsx — toolbar button with Codicon icon
import { Button, Icon } from 'vscrui';

<Button
  appearance="icon"
  disabled={!hasSelection}
  onClick={() => onDelete?.(selectedFeatureIds)}
  title="Delete"
>
  <Icon name="trash" />
</Button>

// FilterDropdown.tsx — vscrui TextField (onChange passes string directly)
import { TextField } from 'vscrui';

<TextField
  placeholder="Search features..."
  value={localQuery}
  onChange={handleTextChange}
/>

// FilterDropdown.tsx — vscrui Checkbox
import { Checkbox } from 'vscrui';

<Checkbox
  label="Name"
  checked={filterState.searchScope.name}
  onChange={(checked: boolean) => updateScope('name', checked)}
/>

// FilterDropdown.tsx — vscrui Dropdown replacing radio group
import { Dropdown } from 'vscrui';

<Dropdown
  options={[
    { label: 'All', value: 'all' },
    { label: 'Hidden only', value: 'hidden-only' },
    { label: 'Visible only', value: 'visible-only' },
  ]}
  value={filterState.visibility}
  onChange={(value: string) => updateVisibility(value)}
/>
```

## CSS Token Migration

```css
/* Before — hardcoded colour */
.debrief-associated-files__action--danger { color: #c62828; }

/* After — design token */
.debrief-associated-files__action--danger { color: var(--debrief-color-danger); }

/* Before — browser media query */
@media (prefers-color-scheme: dark) {
  .debrief-layers-toolbar { background-color: var(--debrief-bg-primary, #1e1e1e); }
}

/* After — ThemeProvider selector */
[data-theme='dark'] .debrief-layers-toolbar {
  background-color: var(--debrief-bg-primary, #1e1e1e);
}
```
