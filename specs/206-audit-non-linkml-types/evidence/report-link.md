# Primary deliverable pointer

The committed audit report is the primary deliverable of this feature:

- [docs/type-audit-2026.md](../../../docs/type-audit-2026.md)

At the audit SHA (`01166d6e`):

- **885** named TypeScript declarations enumerated across **317** files
- **25** drift clusters detected
- Classification: 260 schema-rooted / 5 boundary-loose / 486 single-domain /
  28 cross-domain-hand-typed / 106 drift-candidate
- **6** newly-opened backlog items (#222–#227) + 1 existing item re-used (#204)
- Python cross-domain appendix lists 24 hand-authored Pydantic BaseModels
  whose instances cross the Python↔TS boundary

The scanner and generator are committed at
[scripts/audits/type-audit/](../../../scripts/audits/type-audit/) so the
audit can be re-run deterministically at any future commit.
