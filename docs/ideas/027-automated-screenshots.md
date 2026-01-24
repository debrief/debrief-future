# Add automated screenshot capture for Storybook stories

## Problem

When creating blog posts and LinkedIn content about new features, we need screenshots demonstrating the UI components. Currently this requires manual intervention, breaking the autonomous content creation workflow.

## Proposed Solution

Add a screenshot capture capability that:
- Runs during local development via a manual command
- Uses a headless browser (e.g., Playwright) to render any Storybook story
- Outputs images at 1200x630 pixels (LinkedIn/OG image standard)
- Saves screenshots to the `media/` folder within the spec being implemented

## Success Criteria

- Any Storybook story can be captured via command
- Output is 1200x630 PNG suitable for social media
- Screenshots land in spec's `media/` folder (e.g., `specs/027-feature/media/`)
- Works offline (headless browser runs locally)

## Constraints

- Must work offline (CONSTITUTION requirement)
- Should integrate with existing Storybook setup (item 001-shared-react-components)
- No human-in-the-loop required for screenshot capture

## Out of Scope

- CI automation (manual trigger only for now)
- Multiple output sizes (single 1200x630 format)
- Video capture
- Annotation/editing of screenshots
