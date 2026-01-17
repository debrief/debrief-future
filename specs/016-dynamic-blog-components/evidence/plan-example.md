# Example plan.md with Media Components Section

**Purpose**: Demonstrates how the Media Components section would be populated for a feature with visual components.

---

## Example: Timeline Component Feature

This example shows how the Media Components section would look for a hypothetical "Timeline Scrubbing" feature that includes a new interactive timeline component.

```markdown
## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| TimelineScrubber | `src/components/Timeline/Timeline.stories.tsx` | `timeline-scrubber.js` | Interactive timeline with playback controls |
| TrackMarker | `src/components/Timeline/TrackMarker.stories.tsx` | `track-marker.js` | Vessel track marker animation |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/timeline-timelinescrubber--default`
```

---

## Example: Backend Feature (No Components)

This example shows how the section appears for a backend/infrastructure feature with no visual components.

```markdown
## Media Components

*Identify Storybook stories to bundle for blog post demos. This section is optional - skip if the feature has no visual components.*

None - backend/infrastructure feature

This feature (REP File Parser) is a pure data transformation service with no UI components.
```

---

## Example: Feature with Conditional Components

This example shows a feature where some components are included and others are excluded.

```markdown
## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| VesselCard | `src/components/Vessels/VesselCard.stories.tsx` | `vessel-card.js` | Vessel info display with status |

**Inclusion Criteria Applied**:
- [x] New visual component
- [ ] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/vessels-vesselcard--default`

### Excluded Components

| Component | Reason for Exclusion |
|-----------|---------------------|
| VesselList | Minor styling change only |
| VesselTable | No story exists |
| VesselPopup | Requires map context to render |
```

---

## Key Points for Authors

1. **The section is optional** - Skip entirely for backend features
2. **Author confirms suggestions** - The plan agent suggests, you decide
3. **Verify bundleability** - Not all stories can be bundled (context dependencies)
4. **Size matters** - Target < 500KB per bundle
5. **Link to Storybook** - Include permanent URL for full experience
