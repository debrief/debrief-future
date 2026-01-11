# PRD: Speckit UI Workflow Enhancement

**Document Type**: Product Requirements Document
**Created**: 2026-01-11
**Status**: Ready for Implementation
**Target**: `.specify/templates/` and `.claude/commands/`

## Problem Statement

The current speckit workflow treats all features uniformly, regardless of whether they involve user-facing interfaces. This leads to specifications that are functionally complete but lack critical interaction design details for UI features.

**Observed Gap**: When specifying the Loader Mini-App (004), the spec captured functional requirements (load file, select store, create plot) but missed:
- Dialog workflow structure (single screen vs. wizard)
- User decision points and what informs them
- Screen state progression (initial → selecting → processing → complete)
- Information hierarchy (what's most important to display)

These gaps surface during `/speckit.clarify` or planning, requiring backtracking that could have been avoided with proper upfront capture.

## Proposed Solution

Enhance the speckit specification workflow to detect UI-heavy features and prompt for interaction design details during the `/speckit.specify` phase.

### Changes Required

#### 1. Enhance `spec-template.md`

Add an optional section for UI features that captures interaction design:

```markdown
## User Interface Flow *(include for features with user-facing dialogs/screens)*

### Decision Analysis
- **Primary Goal**: [What is the user trying to accomplish?]
- **Key Decision(s)**: [What choices must the user make?]
- **Decision Inputs**: [What information helps the user decide?]

### Screen Progression

| Step | Screen/State | User Action | System Response |
|------|--------------|-------------|-----------------|
| 1    | [Initial]    | [Action]    | [Response]      |

### UI States
- **Empty**: [What to show when no data/options available]
- **Loading**: [Feedback during processing]
- **Error**: [How failures are communicated]
- **Success**: [Completion confirmation]

### Wireframe Sketch (Optional)

[ASCII mockup or prose description of key screens]
```

**Placement**: After "User Scenarios & Testing", before "Requirements"

**Guidance Text**: Add HTML comment explaining when to include this section and how to complete each subsection.

#### 2. Enhance `speckit.specify.md` Command

Add feature-type detection and conditional section generation.

**Location**: Insert after step 4.2 ("Extract key concepts") in the execution flow.

**New Step 4a - Feature Type Detection**:

```markdown
4a. Detect feature type from description:

    Scan the feature description for UI indicators:
    - UI_FEATURE triggers: dialog, screen, form, wizard, app, window,
      button, UI, interface, desktop, mobile, panel, modal, picker,
      selector, dropdown, menu
    - SERVICE_FEATURE triggers: API, service, backend, parser,
      processor, handler, worker, queue, batch
    - CLI_FEATURE triggers: command, terminal, CLI, shell, console

    A feature may have multiple types (e.g., desktop app with CLI).
    Default to SERVICE_FEATURE if no clear indicators.
```

**New Step 4b - UI Section Generation** (conditional):

```markdown
4b. For UI_FEATURE=true, additionally capture and generate:

    Before writing User Scenarios, analyze:
    1. What is the primary goal the user is trying to accomplish?
    2. What decision(s) must the user make to complete their goal?
    3. What information does the user need to make each decision?
    4. What is the logical progression of screens/states?

    Generate the "User Interface Flow" section with:
    - Decision Analysis subsection (goal, decisions, inputs)
    - Screen Progression table (minimum 3 rows for typical flow)
    - UI States subsection (empty, loading, error, success)
    - Wireframe Sketch placeholder (can be completed later)

    If key UI decisions cannot be determined from the description,
    mark with [NEEDS CLARIFICATION: ...] following the existing rules
    (max 3 total clarifications across entire spec).
```

**Update Step 5** (Write specification):

```markdown
5. Write the specification to SPEC_FILE:
   - Use template structure
   - Include "User Interface Flow" section if UI_FEATURE=true
   - Omit "User Interface Flow" section if UI_FEATURE=false
```

**Update Validation Checklist** (Step 6a):

Add to "## Feature Readiness" section:

```markdown
## Feature Readiness

- [ ] All functional requirements have clear acceptance criteria
- [ ] User scenarios cover primary flows
- [ ] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification
- [ ] (UI features) User Interface Flow section completed with decision analysis
- [ ] (UI features) Screen progression covers happy path minimum
```

#### 3. Add Examples to Template

Include a filled example in the template comments showing a completed "User Interface Flow" section for reference.

**Example to include**:

```markdown
<!--
EXAMPLE - User Interface Flow for a file upload dialog:

### Decision Analysis
- **Primary Goal**: Upload a document to the system
- **Key Decision(s)**:
  1. Which file to upload
  2. Which folder/category to place it in
  3. Whether to replace existing file (if duplicate)
- **Decision Inputs**:
  - File browser showing local files
  - Folder tree showing available destinations
  - Duplicate warning with existing file details

### Screen Progression

| Step | Screen/State | User Action | System Response |
|------|--------------|-------------|-----------------|
| 1    | File Selection | Click "Browse" or drag file | Show selected file name and size |
| 2    | Destination | Select target folder | Highlight selected folder |
| 3    | Confirmation | Click "Upload" | Show progress indicator |
| 4    | Complete | View result | Show success message with link |

### UI States
- **Empty**: "Drag a file here or click Browse to select"
- **Loading**: Progress bar with percentage and cancel option
- **Error**: Red banner with specific error and retry button
- **Success**: Green checkmark with "View file" link
-->
```

## Requirements

### Functional Requirements

- **FR-001**: `spec-template.md` MUST include a "User Interface Flow" section marked as optional.
- **FR-002**: The UI section MUST contain subsections for: Decision Analysis, Screen Progression, UI States.
- **FR-003**: `speckit.specify` command MUST detect UI features based on keyword triggers in the description.
- **FR-004**: `speckit.specify` command MUST generate the UI section when UI indicators are detected.
- **FR-005**: `speckit.specify` command MUST omit the UI section when no UI indicators are detected.
- **FR-006**: The validation checklist MUST include UI-specific items that only apply when UI section is present.
- **FR-007**: Template MUST include an example of a completed UI section in comments.
- **FR-008**: UI detection MUST NOT require user to explicitly declare feature type.

### Non-Functional Requirements

- **NFR-001**: Changes MUST be backward compatible (existing specs without UI section remain valid).
- **NFR-002**: UI section guidance MUST be understandable by non-technical stakeholders.
- **NFR-003**: Feature detection MUST have low false-negative rate (prefer including UI section when uncertain).

## Success Criteria

- **SC-001**: Specifying a feature with "dialog" or "app" in description automatically generates UI section.
- **SC-002**: Specifying a pure backend service (API, parser) does NOT generate UI section.
- **SC-003**: Generated UI section captures at least: primary goal, one decision, and 3-step progression.
- **SC-004**: Validation checklist correctly identifies incomplete UI sections.
- **SC-005**: Existing specs (000-003) pass validation without modification.

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `.specify/templates/spec-template.md` | Modify | Add optional UI section with guidance |
| `.claude/commands/speckit.specify.md` | Modify | Add feature detection and conditional generation |

## Testing Approach

1. **Positive Test**: Run `/speckit.specify` with "Create a file upload dialog" - verify UI section generated
2. **Negative Test**: Run `/speckit.specify` with "Create a file parser service" - verify UI section NOT generated
3. **Regression Test**: Validate existing specs (000-003) still pass quality checklist
4. **Edge Case**: Run `/speckit.specify` with "Create an API with admin dashboard" - verify UI section generated (hybrid feature)

## Out of Scope

- Creating a separate `/speckit.ux` command (may be added later)
- Modifying `/speckit.clarify` to prioritize UI questions (separate enhancement)
- Adding wireframe generation tooling
- Changes to `plan-template.md` or `tasks-template.md`

## Implementation Notes

- Feature detection should be case-insensitive
- When in doubt, include the UI section (false positive is better than false negative)
- The UI section can be removed manually if not applicable
- ASCII wireframes are optional; prose descriptions are acceptable
