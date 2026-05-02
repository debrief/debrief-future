# Constitution Amendment Diff (#236 — Article IV.4)

This document captures the constitutional amendment landed alongside
the IndexedDB-only persistence layer. The amendment formalises the
host-adaptor pattern from #174 and explicitly authorises browser-native
persistence behind the unified writer abstraction.

## Sync Impact Report bump

`1.2.0 → 1.3.0` (MINOR — new clause, no breaking change).

The amendment adds a new sub-clause (IV.4) to existing Article IV
(Architectural Boundaries) without removing or modifying earlier
clauses. The original IV.2 (`Frontends never persist — frontends
orchestrate calls to services. All data writes go through services.`)
remains in place and remains the default reading; IV.4 narrows the
absolute reading by re-anchoring the persistence boundary around the
writer abstraction rather than the host process.

## Unified diff

```diff
diff --git a/.specify/memory/constitution.md b/.specify/memory/constitution.md
--- a/.specify/memory/constitution.md
+++ b/.specify/memory/constitution.md
@@ -1,33 +1,21 @@
 <!--
   Sync Impact Report
   ====================
-  Version change: 0.0.0 (template) → 1.1.0
-  Modified principles: N/A (initial population from CONSTITUTION.md)
-  Added sections:
-    - Article I — XIV + Governance section
-  Removed sections: None
-  Templates requiring updates: None
-  Follow-up TODOs: None
+  Version change: 1.2.0 → 1.3.0 (MINOR — new clause, no breaking change)
+  Modified principles: IV. Architectural Boundaries
+    - Added IV.4 "Persistence-host abstraction" — formalises that the
+      writer abstraction (not the host process) is the persistence
+      boundary, allowing browser-native stores (IndexedDB, OPFS, File
+      System Access API) to qualify as a persistence backend when
+      accessed through the unified writer interface. Machine-enforced
+      via ESLint (no-direct-persistence-in-frontend).
+  Earlier history: 0.0.0 (template) → 1.1.0 — initial population from
+  CONSTITUTION.md (Articles I–XIV + Governance).
+  Templates requiring updates: None (IV.4 restricts implementation
+  patterns; existing templates do not reference IV by clause).
   Follow-up TODOs: None
 -->
@@ -78,6 +66,7 @@ other guidance.
 1. **Services never touch UI** — Python services return data only. All display and interaction decisions belong to frontends.
 2. **Frontends never persist** — frontends orchestrate calls to services. All data writes go through services.
 3. **Services have zero MCP dependency** — domain logic lives in pure Python libraries. MCP wrappers are thin, replaceable layers.
+4. **Persistence-host abstraction.** Frontends may persist data only via the unified writer abstraction. Browser-native stores (IndexedDB, OPFS, File System Access API) qualify as a persistence backend **only** when accessed through this abstraction — frontends never own a divergent write code path. The writer abstraction is the persistence boundary; both Node-side hosts and browser-side hosts route their writes through it. Each host implements the abstraction once, against its native backend; the rest of the system depends only on the interface. Machine-enforced via ESLint (`no-direct-persistence-in-frontend`).
```

The same paragraph also lands at the same location in `CONSTITUTION.md`.

## Why this amendment is necessary

The strict reading of the original IV.2 (`Frontends never persist`) is
incompatible with the static-deployment promise. The web-shell ships
to GitHub Pages; there is no Node runtime in production. Captures
without IndexedDB silently revert to session-only — exactly the
FR-WEB-029a "Session-only" badge that #236 set out to remove.

Without IV.4, two workable readings remain:

1. **Strict IV.2** — frontends never persist, so the web-shell cannot
   persist captures. The badge stays. Spec rejected.
2. **Loose IV.2** — frontends MAY persist, undoing the principle's
   teeth. The web-shell could write directly to `localStorage` from any
   component, drift from VS Code's catalog semantics, and re-introduce
   the divergent write paths the principle was designed to prevent.

IV.4 takes a third route: re-anchor the principle around the
**interface** as the persistence boundary, not the host process. A
browser implementing IndexedDB writes through the same `StacWriter`
interface as VS Code's Node-fs writes is *not* a frontend persisting
in violation of IV.2 — it's the abstraction extending into the
browser, with the same operation surface and the same atomicity
guarantees scoped to whatever each backend supports.

## Machine enforcement

The principle is enforced at lint time via the new
`no-direct-persistence-in-frontend` rule
(`shared/eslint-rules/no-direct-persistence-in-frontend.cjs`):

- `node:fs`/`fs`/`fs/promises` imports are forbidden under
  `apps/web-shell/**` (production source — vitest test files exempt).
- `indexedDB`, `localStorage`, `sessionStorage`, `caches` globals are
  forbidden outside two explicit host-adaptor files:
  - `apps/web-shell/src/services/stacWriterIdb.ts`
  - `apps/web-shell/src/services/stacWriterCapability.ts`

Captured deliberate-violation lint output:
[`eslint-enforcement-output.txt`](./eslint-enforcement-output.txt) —
all three violation classes caught.

## ADR linkage

Architectural Decision Record:
[`docs/project_notes/decisions.md` → ADR-028](../../../docs/project_notes/decisions.md).

Originating spec: this feature
([`specs/236-web-shell-stac-writes/`](..)).
