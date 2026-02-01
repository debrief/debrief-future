# Data Model: vscrui Component and Theme Library Conversion

No new data models, schemas, or Pydantic types are introduced. This feature modifies existing React component implementations and CSS files.

## Design Token Schema

### Existing Tokens (no changes)

Defined in `shared/components/src/styles/tokens.css`:

| Token | Purpose |
|-------|---------|
| `--debrief-color-danger` | Destructive action styling (delete, remove) |
| `--debrief-bg-*` | Background colours per theme |
| `--debrief-fg-*` | Foreground/text colours per theme |
| `--debrief-border-*` | Border colours per theme |

### New Token

| Token | Purpose | Light Value | Dark Value |
|-------|---------|-------------|------------|
| `--debrief-color-attention` | Change notification halo (YellowHalo animation) | `rgba(255, 193, 7, 0.6)` | `rgba(255, 193, 7, 0.6)` |

## Component Prop Mapping

No props are added or removed. All existing props and callbacks are preserved. The mapping is implementation-only (raw HTML → vscrui):

### Button Mapping

```
Raw HTML                          → vscrui
─────────────────────────────────────────────────
<button onClick={fn}>             → <Button onClick={fn}>
<button disabled>                 → <Button disabled>
className="...__btn"              → appearance="icon"
className="...__action-icon-btn"  → appearance="icon"
className="...__context-btn"      → appearance="secondary"
```

### Input Mapping

```
Raw HTML                          → vscrui
─────────────────────────────────────────────────
<input type="text" onChange={fn}>  → <TextField onChange={fn}>
<input type="checkbox" checked>    → <Checkbox checked label="...">
<input type="radio"> group         → <Dropdown value={v} onChange={fn}>
<input type="datetime-local">      → Stays as native input (styled with tokens)
```

### Icon Mapping

```
Inline SVG                        → vscrui
─────────────────────────────────────────────────
<svg>trash icon</svg>             → <Icon name="trash" />
<svg>eye icon</svg>               → <Icon name="eye" />
<svg>eye-slash icon</svg>         → <Icon name="eye-closed" />
<svg>play icon</svg>              → <Icon name="play" />
<svg>search icon</svg>            → <Icon name="search" />
<svg>filter icon</svg>            → <Icon name="filter" />
<svg>check-all icon</svg>         → <Icon name="check-all" />
<svg>check icon</svg>             → <Icon name="check" />
<svg>plus icon</svg>              → <Icon name="add" />
<svg>minus icon</svg>             → <Icon name="remove" />
<svg>eraser icon</svg>            → Retained as inline SVG (no Codicon equivalent)
<svg>paperclip icon</svg>         → Retained as inline SVG (no Codicon equivalent)
```

## CSS Selector Migration

```
Before                                    → After
──────────────────────────────────────────────────────
@media (prefers-color-scheme: dark) {     → [data-theme='dark'] {
  .component { color: var(--token); }     →   .component { color: var(--token); }
}                                         → }
```

## State Transitions

No new state is introduced. Component state (checked, selected, disabled, expanded) remains unchanged. The vscrui components accept the same state props as the raw HTML elements they replace.
