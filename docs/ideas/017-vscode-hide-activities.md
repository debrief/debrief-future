# Configure VS Code extension to hide default activities on load

## Problem

When the VS Code extension loads, users see the full VS Code activity bar with many activities (Search, Source Control, Run and Debug, Extensions, Testing, etc.) that aren't relevant for the Debrief maritime analysis workflow. This creates visual clutter and may confuse users focused on track analysis.

## Proposed Solution

Configure the VS Code extension to hide all default activities except:
1. **Explorer** — Contains the file tree plus the new STAC browser for plot management
2. **Debrief** — A new custom activity for Debrief-specific functionality (contents TBD in separate item)

The extension should programmatically hide activities on activation, creating a focused analysis environment.

## Success Criteria

- [ ] All default activities except Explorer are hidden when extension activates
- [ ] A new "Debrief" activity appears in the activity bar
- [ ] Users can re-enable hidden activities through VS Code settings if needed
- [ ] Hiding is reversible — not a hard lock on the VS Code experience

## Constraints

- Must work offline (CONSTITUTION requirement)
- Should use standard VS Code extension APIs for activity bar manipulation
- Must not break core VS Code functionality — hidden activities should still work if re-enabled

## Out of Scope

- Contents of the "Debrief" activity (separate backlog item)
- Hiding activities for non-Debrief workspaces (this is Debrief-extension-specific)
- Customisation UI for choosing which activities to hide
