# Quickstart: SpecKit UI Workflow Enhancement

**Feature**: 004-speckit-ui-workflow
**Date**: 2026-01-11

## What Changed

The `/speckit.specify` command now automatically detects when you're specifying a UI feature and generates an additional "User Interface Flow" section to capture interaction design details.

## Quick Reference

### UI Features (section generated)

Use these keywords in your feature description to trigger UI section generation:

```
dialog, screen, form, wizard, app, window, button, UI,
interface, desktop, mobile, panel, modal, picker, selector,
dropdown, menu
```

**Example**:
```
/speckit.specify Create a file upload dialog for importing track data
```

### Service Features (no UI section)

These keywords indicate backend/service features:

```
API, service, backend, parser, processor, handler, worker, queue, batch
```

**Example**:
```
/speckit.specify Create a REP file parser service
```

### CLI Features (no UI section)

These keywords indicate command-line features:

```
command, terminal, CLI, shell, console
```

**Example**:
```
/speckit.specify Create a CLI command for batch processing
```

## Usage Examples

### Example 1: UI Feature

```
/speckit.specify Create a settings wizard for user preferences
```

**Generated spec includes**:
- Standard sections (User Scenarios, Requirements, Success Criteria)
- **User Interface Flow** section with:
  - Decision Analysis (goal, decisions, inputs)
  - Screen Progression table
  - UI States (empty, loading, error, success)

### Example 2: Backend Service

```
/speckit.specify Create an API endpoint for track queries
```

**Generated spec includes**:
- Standard sections only
- No User Interface Flow section

### Example 3: Hybrid Feature

```
/speckit.specify Create an API with admin dashboard
```

**Generated spec includes**:
- User Interface Flow section (because "dashboard" is a UI indicator)
- UI keywords take precedence over service keywords

## New Validation Items

When your spec includes a User Interface Flow section, validation will check:

- [ ] (UI features) User Interface Flow section completed with decision analysis
- [ ] (UI features) Screen progression covers happy path minimum

These items are skipped for non-UI specs.

## Template Example

The spec template now includes a commented example showing a completed UI section:

```markdown
<!--
EXAMPLE - User Interface Flow for a file upload dialog:

### Decision Analysis
- **Primary Goal**: Upload a document to the system
- **Key Decision(s)**:
  1. Which file to upload
  2. Which folder/category to place it in
  3. Whether to replace existing file (if duplicate)
...
-->
```

## Backward Compatibility

- Existing specs (000-003) remain valid without changes
- The UI section is optional - specs without it pass validation
- You can manually remove the UI section if generated incorrectly

## Testing the Enhancement

After implementation, verify with these test cases:

| Description | Expected Result |
|-------------|-----------------|
| "Create a file upload dialog" | UI section generated |
| "Create a file parser service" | No UI section |
| "Create an API with admin dashboard" | UI section generated |
| "Create a CLI command for export" | No UI section |

## Files Modified

| File | Change |
|------|--------|
| `.specify/templates/spec-template.md` | Added optional UI Flow section |
| `.claude/commands/speckit.specify.md` | Added feature detection logic |
