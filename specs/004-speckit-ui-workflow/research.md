# Research: SpecKit UI Workflow Enhancement

**Feature**: 004-speckit-ui-workflow
**Date**: 2026-01-11
**Status**: Complete

## Overview

This document captures research findings and design decisions for enhancing the speckit workflow to detect UI features and generate interaction design sections.

## Research Topics

### 1. Feature Detection Approach

**Decision**: Keyword-based detection using predefined trigger lists

**Rationale**:
- Simple to implement and understand
- Predictable behavior (users can learn which words trigger UI section)
- Easy to extend by adding keywords to lists
- No external dependencies (no NLP, no ML)

**Alternatives Considered**:

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| NLP-based classification | More accurate detection | Requires ML dependencies, complex | Violates Constitution IX (minimal dependencies) |
| User explicit declaration | 100% accurate | Extra friction for users | FR-008 requires no explicit declaration |
| Pattern matching (regex) | Flexible | Complex to maintain | Overkill for keyword matching |

### 2. Keyword Selection

**Decision**: Three distinct keyword categories with clear triggers

**UI Trigger Keywords**:
- `dialog`, `screen`, `form`, `wizard`, `app`, `window`
- `button`, `UI`, `interface`, `desktop`, `mobile`
- `panel`, `modal`, `picker`, `selector`, `dropdown`, `menu`

**Service Trigger Keywords** (negative indicators):
- `API`, `service`, `backend`, `parser`, `processor`
- `handler`, `worker`, `queue`, `batch`

**CLI Trigger Keywords** (negative indicators):
- `command`, `terminal`, `CLI`, `shell`, `console`

**Rationale**:
- UI keywords are visual/interactive terms
- Service keywords indicate backend/processing focus
- CLI keywords indicate text-based interfaces (not visual UI)
- Case-insensitive matching ensures reliability

**Detection Logic**:
```
IF any UI_KEYWORD in description:
    INCLUDE UI section
ELSE:
    OMIT UI section
```

Note: UI triggers take precedence. A description with both "API" and "dashboard" will include UI section because "dashboard" is a UI indicator.

### 3. UI Section Structure

**Decision**: Three-part structure (Decision Analysis, Screen Progression, UI States)

**Rationale**:
- **Decision Analysis**: Captures user goals and choice points - critical for understanding user journey
- **Screen Progression**: Table format makes state transitions clear and reviewable
- **UI States**: Ensures error/loading/empty states are considered upfront

**Alternatives Considered**:

| Structure | Pros | Cons | Why Rejected |
|-----------|------|------|--------------|
| Freeform prose | Flexible | Inconsistent, hard to validate | Need structured output for validation |
| Full wireframes required | Complete design | Too heavy for spec phase | Wireframes are optional enhancement |
| Single paragraph | Simple | Misses key details | Doesn't address the original problem |

### 4. Validation Integration

**Decision**: Add conditional checklist items for UI features

**Rationale**:
- UI section is optional, so validation must adapt
- Only check UI items when UI section is present
- Maintains existing validation flow for non-UI specs

**Implementation**:
```markdown
## Feature Readiness

- [ ] All functional requirements have clear acceptance criteria
- [ ] User scenarios cover primary flows
- [ ] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification
- [ ] (UI features) User Interface Flow section completed with decision analysis
- [ ] (UI features) Screen progression covers happy path minimum
```

Items prefixed with "(UI features)" only apply when the spec contains a "User Interface Flow" section.

### 5. Template Example

**Decision**: Include commented example in template

**Rationale**:
- Shows developers what a complete UI section looks like
- Reduces ambiguity about section content
- Can be removed after writing (it's in HTML comments)

**Example chosen**: File upload dialog
- Universal enough to be understood
- Shows all three subsections filled
- Demonstrates realistic complexity

### 6. Backward Compatibility

**Decision**: New section is purely additive, marked optional

**Rationale**:
- Existing specs (000-003) remain valid without changes
- UI section presence doesn't invalidate non-UI specs
- Validation adapts based on section presence

**Verification**: Existing specs will pass validation because:
1. They don't have UI section → UI validation items skipped
2. All existing required sections remain unchanged
3. No structural changes to required sections

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| What happens with ambiguous descriptions? | Include UI section (false positive preferred) - NFR-003 |
| Should CLI features get UI section? | No - CLI is text-based, not visual UI |
| How to handle mixed descriptions? | UI indicators take precedence |

## Conclusion

The research confirms the approach outlined in the PRD is sound:
- Keyword-based detection is appropriate for this use case
- Three-part UI section structure addresses the identified gap
- Conditional validation maintains backward compatibility
- No technical unknowns remain

**Phase 0 Status**: COMPLETE - Ready for Phase 1 (Design & Contracts)
