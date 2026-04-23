## What We're Building

Our architectural rule is simple: if a type crosses the Python ↔ TypeScript boundary, it is defined once in LinkML and generated into Pydantic models and TypeScript types. We do not hand-write those shapes — the generator does. Everything else (purely internal types, React prop interfaces, view-model shapes) is allowed to live as ordinary TypeScript.

The problem is that we have not, so far, checked carefully enough which hand-written types quietly became boundary types over the past year. A recent code-quality pass surfaced around 35 ESLint warnings where we parse untrusted shapes as `Record<string, unknown>` at the edge of a service, plus a handful of drift cases where the same concept (`Coordinate`, `ViewportPolygon`, `DisplayMode`, `PlaybackState`, tool-result envelopes) was declared in two or three places with subtly different shapes. Each warning is, in effect, one place we parse data without a schema. Without a full inventory we cannot tell whether that's five cases or fifty.

Feature 206 produces the inventory. The deliverable is a single committed Markdown report, `docs/type-audit-2026.md`, that enumerates every named `interface`, `type`, and `enum` declaration under `apps/`, `shared/` (excluding generated schemas), and `services/`, and classifies each into one of five buckets:

- **Schema-rooted** — already flows from LinkML (good, leave alone)
- **Boundary** — crosses a process or network edge without a schema (needs schema-rooting)
- **Single-domain convenience** — private to one module (fine as-is)
- **Cross-domain hand-typed** — reused across domains but hand-written (needs review)
- **Drift candidate** — multiple declarations of the same concept that have diverged

Every actionable finding links to a backlog item, either an existing one (#203, #204, #205) or a new one opened as part of the audit PR.

## How It Fits

This is the first item under Epic E11 — Schema-First Boundary Typing — which turns the "LinkML is the single source of truth at boundaries" principle from a guideline into a tracked programme of work. E11 cannot sensibly plan its phases without knowing what it's planning over. A boundary-type rollout that targets "about thirty warnings we've seen" is a guess; a rollout that targets a committed, classified inventory is a plan.

The audit is deliberately zero-production-change. The PR touches `docs/`, `BACKLOG.md`, and a small committed scanner under `scripts/audits/type-audit/`. No runtime code moves. That is the point — we want the catalogue first, before anyone starts editing types.

## Key Decisions

A few calls worth surfacing before implementation begins:

- **Compiler-API scanner, not regex**. The scanner is a short `tsx`-run script that walks the TypeScript AST via the official compiler API. Regex is too loose for declaration detection (it trips on generics, comments, and template literals), and bringing in `ts-morph` as a new dependency would need a Constitution Article IX justification we do not think is warranted for a one-script tool.

- **Auto-tag cheap signals; humans classify**. The scanner auto-tags *candidates* for three things it can detect reliably: imports from the schema package (schema-rooted candidate), aliases that bottom out in `unknown` or `Record<string, unknown>` (boundary candidate), and same-name-different-shape pairs (drift shortlist). The Boundary vs Single-domain vs Cross-domain distinction is a judgement call a machine cannot make well, so the final classification is a human review step. Auto-tagging speeds the review; it does not replace it.

- **The scanner is committed, not a throwaway**. Reproducibility is a functional requirement. The report has a methodology section that lists scanned paths, exclusion rules, and classification rules, so anyone can re-run the audit in six months and diff the result.

- **Follow-up backlog items land in the same PR as the report**. We have watched audits elsewhere produce a crisp document and then a trickle of forgotten follow-ups. Doing both in one PR keeps the work honest.

- **Python cross-domain hand-typed types get an appendix, not a bucket**. The five buckets are TypeScript-centric. Forcing Python declarations through them would muddy both. An appendix surfaces the Python cases for Epic E11 to decide whether they want the same treatment or a separate audit.
