# Research: vscrui Component and Theme Library Conversion

## R1: vscrui Component API Surface

**Decision**: Use vscrui `Button`, `Checkbox`, `TextField`, `Dropdown`, and `Icon` components for the conversion.

**Rationale**: vscrui (github.com/estruyf/vscrui) provides all required components:

| vscrui Component | Key Props | Maps To |
|------------------|-----------|---------|
| `Button` | `appearance` (`primary`, `secondary`, `icon`), `disabled`, `onClick` | All `<button>` elements |
| `Checkbox` | `checked`, `onChange`, `label` | All `<input type="checkbox">` |
| `TextField` | `placeholder`, `value`, `defaultValue`, `onChange`, `disabled`, `readonly` | `<input type="text">` |
| `Dropdown` | `value`, `onChange`, options as string or object array | Radio group replacement |
| `Icon` | `name` (Codicon name), `spin` | Inline SVG replacements |

Additional available components (not needed for this conversion): Badge, Divider, Label, Loader, Pane, Panels, Table/TableRow/TableCell, Tag, TextArea.

**Alternatives considered**: Building custom components was rejected — vscrui already matches VS Code's native look and feel and is the project-standard library (spec 031).

## R2: TextField Does Not Support type="datetime-local"

**Decision**: Retain native `<input type="datetime-local">` elements, styled with `--debrief-*` tokens. Raise a backlog item for a custom date-time picker if needed.

**Rationale**: vscrui TextField hardcodes `type='text'` on the internal `<input>` element. The `{...rest}` spread applies to the wrapper `<div>`, not the input. There is no way to pass `type="datetime-local"` through to the underlying input.

**Alternatives considered**:
- Wrapping TextField and overriding type via ref: rejected — fragile, depends on internal DOM structure.
- Using a third-party date picker: rejected — adds dependency, offline bundling concern, out of scope for this conversion.

**Action**: Style native datetime-local inputs with `--debrief-*` tokens for background, border, and text colour. These inputs already function correctly; the conversion is cosmetic only.

## R3: Visibility Filter — Dropdown vs Radio Group

**Decision**: Use vscrui `Dropdown` with three options: "All", "Hidden only", "Visible only".

**Rationale**: VS Code panels use dropdowns for option groups (Settings, Output channel selector, etc.). Radio groups are uncommon in VS Code UI. vscrui provides `Dropdown` but not a `RadioGroup` component.

**Alternatives considered**: Custom radio group styled to match vscrui — rejected because it would require maintaining custom styling that could drift from vscrui's theme integration.

## R4: Codicon Icon Availability

**Decision**: Use vscrui `Icon` component with Codicon names. Import `vscrui/dist/codicon.css` for the font.

**Rationale**: Verified Codicon mappings from the SRD:

| Action | Codicon Name | Available |
|--------|-------------|-----------|
| Delete | `trash` | Yes |
| Show | `eye` | Yes |
| Hide | `eye-closed` | Yes |
| Run | `play` | Yes |
| Search | `search` | Yes |
| Filter | `filter` | Yes |
| Select All | `check-all` | Yes |
| Select Matched | `check` | Yes |
| Add | `add` | Yes |
| Remove | `remove` | Yes |
| Eraser | — | No equivalent → retain SVG |
| Paperclip | `link` | Partial match → retain SVG for clarity |

**Alternatives considered**: Using a separate icon library (e.g., lucide-react) — rejected, adds dependency and won't match VS Code's native icons.

## R5: Dark Theme Selector Strategy

**Decision**: Replace `@media (prefers-color-scheme: dark)` with `[data-theme='dark']` selector blocks.

**Rationale**: ThemeProvider sets `data-theme` attribute on the root element. Storybook's theme toolbar controls this attribute. Browser media queries bypass ThemeProvider, making Storybook theme switching unreliable.

The existing `vsCodeAdapter.ts` maps `--vscode-*` variables to `--debrief-*` tokens for the `[data-theme='vscode']` variant. Dark mode needs the same ThemeProvider-driven approach.

**Alternatives considered**: Using both media query and data-theme selector — rejected, creates precedence conflicts and doubles maintenance.

## R6: Token Gap — Attention Colour

**Decision**: Add `--debrief-color-attention: rgba(255, 193, 7, 0.6)` to `tokens.css` with same value for both light and dark themes.

**Rationale**: YellowHalo.css uses three hardcoded yellow rgba values for the change-notification animation. All three can reference the same token with CSS opacity adjustments:
- Full: `var(--debrief-color-attention)` → `rgba(255, 193, 7, 0.6)`
- Mid: Use `color-mix(in srgb, var(--debrief-color-attention) 83%, transparent)` → approximately 0.5 opacity
- Zero: `transparent`

**Alternatives considered**: Three separate tokens (attention, attention-mid, attention-fade) — rejected, over-engineering for a single animation keyframe.

## R7: Danger Colour Token

**Decision**: Use existing `--debrief-color-danger` token for the 3 hardcoded `#c62828` / `rgba(198, 40, 40, ...)` values in AssociatedFilesDropdown.css.

**Rationale**: Checked `tokens.css` — `--debrief-color-danger` is already defined. The hardcoded values are duplicates that bypassed the token system.

For the `rgba(198, 40, 40, 0.06)` background hover, use `color-mix(in srgb, var(--debrief-color-danger) 6%, transparent)`.

**Alternatives considered**: Adding a `--debrief-color-danger-bg` token — acceptable but unnecessary given `color-mix()` solves it without a new token.

## R8: vscrui Installation and Bundling

**Decision**: Add `vscrui` to `shared/components/package.json` dependencies. Import `vscrui/dist/codicon.css` in `.storybook/preview.tsx` and in the component library entry point.

**Rationale**: vscrui is distributed as an npm package with bundled CSS. The Codicon font is included in the package (no CDN required), satisfying the offline-by-default constitution requirement.

**Alternatives considered**: Adding vscrui as a devDependency only — rejected, it's a runtime dependency used in production components.
