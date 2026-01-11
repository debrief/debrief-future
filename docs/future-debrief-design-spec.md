# Future Debrief Design Specification

> Maritime professional. Technical credibility. Operations room, not marketing deck.

## Design Principles

1. **Substance over decoration** — every visual element should communicate information or establish hierarchy, not fill space
2. **Chart-room aesthetic** — draw from naval operational graphics, not consumer maritime imagery
3. **Technical confidence** — design for an audience that reads sonar waterfalls and tactical plots daily
4. **Restrained colour** — let content dominate; colour highlights, doesn't decorate

---

## Colour Palette

### Primary Colours

| Name | Hex | Usage |
|------|-----|-------|
| Slate Navy | `#1e2a3a` | Primary text, headers, navigation background |
| Chart Cream | `#f5f3ee` | Page background, content areas |
| Operations White | `#ffffff` | Cards, code blocks, high-contrast areas |

### Accent Colours

| Name | Hex | Usage |
|------|-----|-------|
| Bearing Blue | `#2d5a7b` | Links, interactive elements, track lines |
| Signal Amber | `#d4a03c` | Highlights, warnings, active states |
| Contact Red | `#8b3a3a` | Errors, critical alerts (used sparingly) |
| Sonar Green | `#3a6b5c` | Success states, positive indicators |

### Extended Palette (data visualisation)

| Name | Hex | Purpose |
|------|-----|---------|
| Depth 1 | `#e8e4dc` | Lightest background tone |
| Depth 2 | `#d4d0c7` | Borders, dividers |
| Depth 3 | `#9a958a` | Secondary text, captions |
| Depth 4 | `#5c5850` | Tertiary text |

### Usage Rules

- Bearing Blue for all interactive elements (links, buttons, focus states)
- Signal Amber sparingly — one highlight per view maximum
- Contact Red only for actual errors, never decoration
- 60% Chart Cream / 30% Slate Navy / 10% accents

---

## Typography

### Font Stack

```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

**Rationale**: Inter has excellent readability at small sizes and a professional, neutral character. JetBrains Mono is designed for code legibility.

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | 2.25rem (36px) | 600 | 1.2 | -0.02em |
| H2 | 1.75rem (28px) | 600 | 1.25 | -0.01em |
| H3 | 1.25rem (20px) | 600 | 1.3 | 0 |
| H4 | 1rem (16px) | 600 | 1.4 | 0.01em |
| Body | 1rem (16px) | 400 | 1.6 | 0 |
| Small | 0.875rem (14px) | 400 | 1.5 | 0.01em |
| Caption | 0.75rem (12px) | 500 | 1.4 | 0.02em |
| Code | 0.9rem (14.4px) | 400 | 1.5 | 0 |

### Typography Rules

- Body text always Slate Navy on Chart Cream — maximum contrast
- No bold within body paragraphs except for genuine emphasis
- Headers use negative letter-spacing for tighter, more authoritative feel
- Monospace for: code, file names, data values, coordinates, timestamps
- ALL CAPS only for labels and badges, never headers

---

## Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight inline spacing |
| `--space-2` | 8px | Related element gaps |
| `--space-3` | 12px | Standard padding |
| `--space-4` | 16px | Card padding, section gaps |
| `--space-6` | 24px | Component separation |
| `--space-8` | 32px | Section separation |
| `--space-12` | 48px | Major section breaks |
| `--space-16` | 64px | Page section separation |

### Layout

- Max content width: 720px (prose), 960px (with sidebar), 1200px (full layouts)
- Consistent left alignment — no centred body text
- Generous vertical spacing between sections (space-12 minimum)

---

## Components

### Navigation Bar

- Fixed top, Slate Navy background
- Logo left, nav links right
- Height: 64px
- "Future Debrief" wordmark in Operations White
- Optional: subtle bearing-line pattern as background texture (5% opacity)

### Post Cards (index pages)

- Operations White background
- 1px Depth 2 border
- No drop shadows
- Generous padding (space-6)
- Date in Caption style, Depth 3 colour
- Title in H3, Slate Navy
- Excerpt in Body, truncated to 3 lines

### Article Layout

- Chart Cream background
- Content centred, max 720px
- Date and reading time in Caption style, top
- Title in H1
- Author byline subtle, bottom of header
- Body text with comfortable 1.6 line height

### Code Blocks

- Operations White background
- 1px Depth 2 border, 4px radius
- JetBrains Mono
- Subtle syntax highlighting (muted colours, not rainbow)
- Copy button top-right (appears on hover)

### Blockquotes

- Left border: 3px Bearing Blue
- Depth 1 background
- Italic body text
- Used for callouts and important notes

### Buttons

- Primary: Bearing Blue background, Operations White text
- Secondary: transparent, 1px Bearing Blue border, Bearing Blue text
- Height: 40px
- Padding: 0 space-4
- Border radius: 4px
- No gradients, no shadows

### Tags/Badges

- Small text, ALL CAPS
- Depth 1 background, Slate Navy text
- Pill shape (large border radius)
- Minimal padding

---

## Imagery Guidelines

### Screenshots

- Actual product screenshots preferred over mockups
- Consistent browser chrome or none at all
- Subtle shadow if floating (8px blur, 10% black)

### Diagrams

- Use Bearing Blue for primary elements
- Depth palette for secondary elements
- Clean, technical style — no hand-drawn or sketch effects
- Mermaid diagrams styled to match palette

### Decorative Elements (use sparingly)

- Bearing lines: thin (1px), Depth 2 colour, radiating patterns
- Grid overlays: subtle, evoking chart paper
- Contour lines: abstract bathymetric patterns as section backgrounds
- No: ship silhouettes, anchors, waves, maritime clip art

### Hero/Header Areas

- Abstract: bearing fans, track segments, sonar waterfall crops
- Could use heavily processed/abstracted screenshots
- Never stock photos

---

## Motion & Interaction

- Transitions: 150ms ease-out for hovers, 250ms for layout changes
- No bounces, springs, or playful animations
- Focus states: 2px Bearing Blue outline, 2px offset
- Hover states: subtle background colour shift, not dramatic

---

## Dark Mode (future consideration)

Reserve dark mode for operational contexts. Palette inversion:

| Light | Dark |
|-------|------|
| Chart Cream | `#0f1419` |
| Slate Navy | `#e8e4dc` |
| Operations White | `#1a2332` |

Accents remain similar but adjusted for contrast.

---

## Implementation Notes

### CSS Custom Properties

```css
:root {
  /* Colours */
  --color-slate-navy: #1e2a3a;
  --color-chart-cream: #f5f3ee;
  --color-white: #ffffff;
  --color-bearing-blue: #2d5a7b;
  --color-signal-amber: #d4a03c;
  --color-contact-red: #8b3a3a;
  --color-sonar-green: #3a6b5c;
  --color-depth-1: #e8e4dc;
  --color-depth-2: #d4d0c7;
  --color-depth-3: #9a958a;
  --color-depth-4: #5c5850;
  
  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* Layout */
  --content-width: 720px;
  --content-width-wide: 960px;
  --content-width-full: 1200px;
}
```

### Required Assets

- Inter font (Google Fonts or self-hosted)
- JetBrains Mono font (Google Fonts or self-hosted)
- Future Debrief wordmark (to be created)
- Favicon set in new palette

---

## Comparison: Legacy vs Future

| Aspect | Legacy Site | Future Debrief |
|--------|-------------|----------------|
| Primary colour | Bright red #c41e3a | Bearing Blue #2d5a7b |
| Background | Pure white | Chart Cream #f5f3ee |
| Typography | Mixed/default | Inter + JetBrains Mono |
| Imagery | Tugboat illustration, stock | Abstract, technical, screenshots |
| Feel | Friendly, accessible | Professional, credible |
| Audience signal | "Easy to use tool" | "Serious analysis platform" |

---

*Spec version: 1.0 — January 2026*
