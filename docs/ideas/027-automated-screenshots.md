# Add automated screenshot capture for Storybook stories

## Problem

When creating blog posts and LinkedIn content about new features, we need screenshots demonstrating the UI components. Currently this requires manual intervention, breaking the autonomous content creation workflow.

## Proposed Solution

Add a screenshot capture capability using **Playwright** that:
- Runs during local development via a CLI command
- Renders any Storybook story in a headless browser
- Outputs images at 1200x630 pixels (LinkedIn/OG image standard)
- Saves screenshots to the `media/` folder within the spec being implemented

### Technology Choice: Playwright

**Why Playwright over alternatives**:
- Works offline (runs local Chromium/Firefox/WebKit)
- CLI-invokable — LLM can call via Bash during development
- Supports precise viewport sizing
- Waits for components to render before capture
- Standard tool for Storybook visual testing

**Usage pattern**:
```bash
# Wrapper script for LLM/developer use
./scripts/capture-story.sh <story-id> <output-filename>

# Example
./scripts/capture-story.sh components-map--default map-component.png
```

**Implementation approach**:
1. Add Playwright as dev dependency
2. Create `scripts/capture-story.sh` wrapper that:
   - Ensures Storybook is running (starts if needed)
   - Builds story URL from story ID
   - Captures at 1200x630 viewport
   - Saves to current spec's `media/` folder

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
