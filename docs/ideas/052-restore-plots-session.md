# Restore previously-open plots on VS Code startup

## Problem

When a user closes VS Code and reopens it later, they lose context — the plots they were working with are gone and must be manually reopened. This interrupts workflow and feels unpolished.

## Proposed Solution

Automatically restore the STAC item(s) that were open in the previous session when VS Code starts.

**Implementation approach**:
1. On plot open: persist the STAC item reference to VS Code workspace state or extension config
2. On VS Code startup: read persisted references and automatically open them
3. If a previously-open plot no longer exists (file deleted/moved): silently skip it

## Success Criteria

- Opening VS Code with a previously-open plot restores that plot automatically
- Multiple plots are restored if multiple were open
- Missing/deleted plots are silently skipped (no error shown)
- Works offline (local state only)

## Constraints

- Must work offline (CONSTITUTION Article I)
- Use VS Code workspace state or extension globalState for persistence
- First iteration: restore which plots were open only (not view state like zoom/pan/time position)

## Out of Scope

- Restoring map view state (zoom, pan position)
- Restoring time controller position
- Restoring panel visibility (timeline, tools, etc.)
- User prompt before restoration
