# Usage Example: SpecKit UI Workflow Enhancement

**Feature**: 004-speckit-ui-workflow
**Date**: 2026-01-11

## How It Works

The `/speckit.specify` command now automatically detects whether a feature involves user interfaces and generates the appropriate spec structure.

## Example 1: UI Feature (Dialog)

**Command**:
```
/speckit.specify Create a file upload dialog for importing track data
```

**Detection**: "dialog" is a UI trigger keyword → UI section included

**Generated Spec Structure**:
```markdown
# Feature Specification: File Upload Dialog

## User Scenarios & Testing *(mandatory)*
[Standard user stories...]

## Requirements *(mandatory)*
[Standard functional requirements...]

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis
- **Primary Goal**: Upload track data files to the system
- **Key Decision(s)**:
  1. Which file(s) to upload
  2. Target catalog location
  3. Overwrite behavior for duplicates
- **Decision Inputs**: File browser, catalog selector, file metadata preview

### Screen Progression
| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Initial dialog | Click "Browse" | File picker opens |
| 2 | File selected | Review metadata | Upload button enabled |
| 3 | Uploading | Wait | Progress indicator |
| 4 | Complete | Click "Done" | Dialog closes |

### UI States
- **Empty State**: "No file selected. Click Browse to choose a file."
- **Loading State**: Progress bar with percentage
- **Error State**: Red banner with error details
- **Success State**: Green checkmark with summary

## Success Criteria *(mandatory)*
[Standard measurable outcomes...]
```

## Example 2: Service Feature (No UI)

**Command**:
```
/speckit.specify Create a REP file parser service
```

**Detection**: "parser" and "service" are service keywords, no UI keywords → UI section excluded

**Generated Spec Structure**:
```markdown
# Feature Specification: REP File Parser Service

## User Scenarios & Testing *(mandatory)*
[Standard user stories...]

## Requirements *(mandatory)*
[Standard functional requirements...]

## Success Criteria *(mandatory)*
[Standard measurable outcomes...]
```

**Note**: No "User Interface Flow" section is generated because this is a backend service.

## Example 3: Hybrid Feature (UI Wins)

**Command**:
```
/speckit.specify Create an API with admin dashboard
```

**Detection**:
- "API" is a service keyword
- "dashboard" is a UI keyword
- **Precedence rule**: UI keywords override service keywords
- Result: UI section included

**Generated Spec Structure**:
```markdown
# Feature Specification: API with Admin Dashboard

## User Scenarios & Testing *(mandatory)*
[Standard user stories...]

## Requirements *(mandatory)*
[Standard functional requirements...]

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis
- **Primary Goal**: Monitor and manage API through visual dashboard
[... UI section fully populated ...]

## Success Criteria *(mandatory)*
[Standard measurable outcomes...]
```

## Keyword Reference

### UI Triggers (include UI section)
```
dialog, screen, form, wizard, app, window, button,
UI, interface, desktop, mobile, panel, modal,
picker, selector, dropdown, menu, dashboard
```

### Service Indicators (no UI section unless UI triggers present)
```
API, service, backend, parser, processor,
handler, worker, queue, batch
```

### CLI Indicators (never trigger UI section)
```
command, terminal, CLI, shell, console
```

## Validation Behavior

When a spec includes the "User Interface Flow" section, the validation checklist automatically adds these items:

```markdown
## UI Feature Validation *(only if User Interface Flow section present)*

- [ ] Decision Analysis section completed with primary goal and key decisions
- [ ] Screen Progression table covers the happy path (at least 3 steps)
- [ ] UI States defined for empty, loading, error, and success conditions
- [ ] User decision inputs are identified
```

Specs without UI sections skip these validation items entirely.
