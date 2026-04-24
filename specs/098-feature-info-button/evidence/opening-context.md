## What We're Building

Testing map applications is awkward. The map canvas is a rendered image -- you can't query it with `getByRole` or assert against a coordinate value. If a Playwright test needs to verify that dragging a track point actually changed the geometry, it has to either parse pixels or hope the data matches some indirect signal. Neither is reliable.

We're adding an "info" button to every feature row in the Layers panel. Click it, and a dialog shows the feature's geometry type and coordinates as structured text. Point features show a single coordinate pair. Tracks show every position in their LineString. Zones show their polygon rings. Each value has a `data-testid` attribute, so a test script can open the dialog, read `geometry-type`, read `geometry-coordinates`, and assert. No canvas parsing, no guesswork.

The same button appears on child rows. Expand a track, hover over an individual position, click its info button, and you see that specific point's coordinates -- not the parent track's full geometry. This matters for tests that verify single-point edits.

## How It Fits

This is a pure frontend addition to the shared React component library (`@debrief/components`). The info button slots in next to the format icon we shipped last week in feature 097 -- same hover-visibility pattern, same 20x20px clickable area, same `stopPropagation` to avoid triggering row selection. The GeometryDialog is a new component, but it follows the positioning and dismissal patterns established by CascadingMenu: `position: fixed`, viewport collision detection, click-outside and Escape to close. State lives in ActivityPanel, same as the format menu state. No new dependencies.

## Key Decisions

- **Dialog, not tooltip or inline expansion**: A tooltip would be hard for Playwright to target reliably. Inline expansion would disrupt the virtualised list layout. A dialog with `role="dialog"` and `aria-label` gives test frameworks a clean, stable selector.

- **Structured text, not raw JSON or map preview**: The coordinates are displayed in a formatted list with each pair on its own line, not dumped as a JSON blob. Human-readable for manual inspection, machine-readable via `data-testid` attributes for automation. The spec explicitly ruled out a map preview -- this feature is about data access, not visualisation.

- **Circled "i" SVG icon**: Matches the existing 14x14 inline SVG style used by the format (pencil) and visibility (eye) icons. Same `stroke="currentColor"` approach so it adapts to light, dark, and VS Code themes automatically.

- **Child geometry is derived, not stored**: Child rows (individual positions within a track) don't carry their own geometry object. Instead, the dialog constructs a synthetic `Point` geometry from the child's index and the parent feature's coordinate array. This avoids inflating the memory footprint of the flattened display list.

- **One dialog at a time**: Opening the info dialog for one feature closes any previously open dialog. Same single-state pattern as the format menu.
