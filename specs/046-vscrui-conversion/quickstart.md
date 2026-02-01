# Quickstart: vscrui Component Conversion

## Install vscrui

```bash
cd shared/components
pnpm add vscrui
```

## Import Codicon CSS

In `.storybook/preview.tsx`:

```tsx
import 'vscrui/dist/codicon.css';
```

## Use vscrui Components

### Button (icon variant)

```tsx
import { Button, Icon } from 'vscrui';

// Before
<button className="debrief-layers-toolbar__btn" onClick={onDelete}>
  <svg>...</svg>
</button>

// After
<Button appearance="icon" onClick={onDelete}>
  <Icon name="trash" />
</Button>
```

### TextField

```tsx
import { TextField } from 'vscrui';

// Before
<input type="text" placeholder="Search..." onChange={e => onSearch(e.target.value)} />

// After
<TextField placeholder="Search..." onChange={onSearch} />
```

Note: `TextField.onChange` passes the string value directly, not a synthetic event.

### Checkbox

```tsx
import { Checkbox } from 'vscrui';

// Before
<label><input type="checkbox" checked={isChecked} onChange={toggle} /> Name</label>

// After
<Checkbox label="Name" checked={isChecked} onChange={toggle} />
```

### Dropdown (replacing radio group)

```tsx
import { Dropdown } from 'vscrui';

// Before
<label><input type="radio" value="all" checked={filter === 'all'} onChange={...} /> All</label>
<label><input type="radio" value="hidden" checked={filter === 'hidden'} onChange={...} /> Hidden only</label>
<label><input type="radio" value="visible" checked={filter === 'visible'} onChange={...} /> Visible only</label>

// After
<Dropdown
  value={filter}
  options={['All', 'Hidden only', 'Visible only']}
  onChange={setFilter}
/>
```

## Token Usage

Replace hardcoded colours:

```css
/* Before */
color: #c62828;

/* After */
color: var(--debrief-color-danger);
```

```css
/* Before */
background: rgba(198, 40, 40, 0.06);

/* After */
background: color-mix(in srgb, var(--debrief-color-danger) 6%, transparent);
```

## Verify in Storybook

```bash
cd shared/components
pnpm storybook
```

Switch between Light, Dark, and VS Code themes via the toolbar to verify all components render correctly.
