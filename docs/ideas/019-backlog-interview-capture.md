# Add 'needs-interview' status to backlog workflow

## Problem

When managing the backlog, some ideas are captured at a high level but lack enough detail for implementation. Currently, all ideas must either go through the full interview process immediately or be captured with incomplete information. There's no way to:
- Defer detailed requirements gathering to a later time
- Track which items need interviews
- Batch interview work when the user has dedicated time

## Proposed Solution

Add an "interview deferred" workflow to the backlog system:

1. **New status**: Add `needs-interview` to BACKLOG.md workflow statuses
2. **Agent updates**: Modify backlog agents (opportunity-scout, ideas-guy, backlog-prioritizer) to recognize and set `needs-interview` status
3. **New /interview command**: Create a skill that:
   - Lists all items with `needs-interview` status
   - Allows selection and processing of deferred items
   - Conducts the full interview. Favours multiple choice questions, asked one at a time.
   - Updates item with complete detail and refined scores

## Success Criteria

- [ ] BACKLOG.md documents `needs-interview` status in workflow section
- [ ] Agents can mark items as `needs-interview` when detail is insufficient
- [ ] `/interview` command lists and processes deferred items
- [ ] Preliminary scores given at capture, updated after interview
- [ ] Items transition from `needs-interview` → `proposed` after interview completes

## Constraints

- Must work offline (CONSTITUTION requirement)
- Should integrate with existing /idea workflow
- Preliminary scoring should use same V/M/A dimensions

## Out of Scope

- Automated interview scheduling
- Notifications/reminders for pending interviews
- Changes to speckit workflow (starts after item is fully defined)
