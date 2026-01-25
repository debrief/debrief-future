# LinkedIn Planning Summary: Epic Support

**Post length**: ~175 words

---

When AI breaks down your epic into deliverable items, what should it optimize for?

We're building a `/epic` command that uses Opus as both Business Analyst and Technical Architect. Feed it a feature spec, get back 3-10 independently valuable backlog items—properly sequenced, complexity-estimated, and GitHub-issue-ready.

The key insight: breakdown quality matters more than breakdown speed. A poorly decomposed epic costs more in rework than the extra tokens for deeper analysis.

Our approach:
- Vertical slices over horizontal layers
- Infrastructure first (if it unblocks)
- Research spikes early (to reduce uncertainty)
- Polish items last

Each item gets an `[E01]` prefix for traceability back to the parent epic. No schema changes needed—just a convention that works with existing tools.

First test case: our Storyboarding Briefings feature. Complex enough to validate the approach, documented enough to feed the analyzer.

What sizing do you target for broken-down items? We're aiming for 1-3 day deliverables.

#AI #ProductManagement #AgileWorkflow #DefenceTech

---

*Link placeholder: [Read full planning post]*
