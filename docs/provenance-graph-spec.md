# Requirements Specification: Provenance Graph

**Status:** Draft for review  
**Source:** Analyst meeting + structured requirements interview  
**Relates to:** Future Debrief Analysis Log, session state management

---

## Executive Summary

Credible maritime analysis rests on two things: correct inputs, and transparent reasoning. This specification addresses both.

Analysts routinely incorporate values from authoritative reference sources — vessel characteristics from Lloyds Register, oceanographic parameters from survey databases, threat data from intelligence products. When those reference values change, any analysis that depends on them is potentially invalidated. Currently there is no mechanism to detect this, record it, or prompt the analyst to reassess. This specification defines one.

In parallel, when an analyst revises an assumption — correcting an input parameter or accepting an updated reference value — the downstream effect on the derived solution is not immediately visible. The analyst must mentally track what changed and why. This specification introduces **solution comparison**: automatic side-by-side display of the previous and current solution on the map whenever a recalculation occurs, giving the analyst immediate situational awareness of the impact of any change.

Together, these two capabilities form the foundation of a fully auditable, reproducible analysis pipeline — where every external assumption is recorded, its currency is tracked, and the effect of any revision is visible and documented.

---

## Feature 1 — Reference Data Currency

### Overview

Tool calculations may depend on values drawn from authoritative reference sources outside the Debrief session. An example is vehicle draft, taken from an offline copy of Lloyds Register of Ships, referenced by record identifier. Debrief must store the **reference value at capture**, detect when the upstream source has changed, and alert the analyst — giving them control over whether to accept the updated value before any dependent calculations are re-run.

### Scope

All of the following reference data source types are in scope, with **web pages (URL + XPath)** as the initial implementation target:

- Web pages — URL + XPath/CSS selector (manual entry initially; browser add-in as a future enhancement)
- Structured data feeds — REST APIs, JSON endpoints
- Local files outside the session — CSV, spreadsheet
- Other Debrief sessions / exercises

### Data Model

When a tool consumes a reference data value, the Analysis Log record for that step must store:

- Source type (e.g. `web-page`)
- Source URI
- Selector (e.g. XPath expression)
- Reference value at capture
- Timestamp of last successful fetch
- Currency status (`current` | `changed` | `unavailable` | `source-structure-changed` | `unchecked`)

### Currency States

| State | Meaning |
|---|---|
| `current` | Fetched value matches reference value at capture |
| `changed` | Fetched value differs from reference value at capture |
| `unavailable` | Source could not be reached |
| `source-structure-changed` | Source fetched successfully but selector returned no match — the source has been restructured |
| `unchecked` | Not yet checked in this session |

Each state carries a distinct visual indicator on the Analysis Log card and a tailored message in the notification modal. `source-structure-changed` is explicitly distinct from `unavailable` — the source is reachable but the reference location within it has moved, requiring the analyst to update the selector rather than simply retry.

### Currency Checks

| Trigger | Behaviour |
|---|---|
| **Session open** | Debrief re-fetches all reference data sources referenced in the session and compares against captured values |
| **Manual refresh** | Analyst triggers a per-session refresh from within the Analysis Log panel |
| **Global refresh (future)** | From the STAC catalog browser, analyst triggers a refresh across all plots in the catalog. Runs as a **background job** with a status indicator; results appear when complete, analyst is not blocked. Flags any plots with out-of-date reference data. |

### User Notification

When currency checks complete, if any sources have changed, Debrief presents a single **blocking modal** listing all affected sources. The analyst must acknowledge before continuing — external data changes can materially affect analytical conclusions.

Where multiple sources have changed simultaneously, all are presented in one modal with per-source controls, avoiding a sequence of blocking interruptions on session open.

The modal must provide, per affected source:

| Action | Behaviour |
|---|---|
| **View diff** | Show old vs new value side-by-side before the analyst commits |
| **Accept update** | Update the reference value at capture; re-run all affected downstream calculations automatically |
| **Reject update** | Retain the existing reference value; suppress further alerts for this source in this session |

### Analysis Log Presentation

- Steps with reference data dependencies display a source indicator (e.g. a link icon) on the Analysis Log card
- Out-of-date or structurally changed sources are visually flagged on the relevant card (e.g. a warning badge)
- The reference value at capture and source URI are accessible from the card's detail/flip view

---

## Feature 2 — Solution Comparison (Shadow Tracks)

### Overview

When a tool's inputs are amended and downstream calculations are re-run, analysts need to see not just that steps were re-executed, but **what changed spatially**. This is in effect a manual sensitivity analysis: the analyst perturbs an input assumption and immediately observes how much the derived solution moves. Debrief temporarily renders the previous solution as a **shadow track** alongside the current result, giving immediate situational awareness of the impact of any revision.

### Trigger

Shadow tracks are displayed **automatically whenever a recalculation occurs** — no additional analyst action required. This applies whether the recalculation was triggered by:

- Manual amendment of a tool parameter in the Analysis Log
- Acceptance of an updated reference data value

### Visual Treatment

| Element | Rendering |
|---|---|
| **Previous solution** | Faded / shadow style — low opacity, same colour as the current solution |
| **Current solution** | Full vivid rendering, as normal |

Using the same colour family preserves the association between shadow and current track without requiring analysts to learn a new colour convention.

### Scope

When a recalculation affects multiple downstream steps, **all affected downstream geometries** are shown as shadow tracks simultaneously. The analyst sees the full spatial impact of the change in one view.

### Dismissal

A **dismiss button in the Analysis Log panel** clears all shadow tracks. Dismissal is deliberate — the analyst explicitly closes the comparison when satisfied. No timeout, no implicit dismissal on map interaction.

### Multiple Recalculations

If a further recalculation is triggered while shadow tracks are visible, the new shadow set **replaces** the previous one. Shadow tracks do not accumulate.

### Persistence

Shadow tracks are **always transient**. They are never written to the session file and are cleared on session close.

---

## Future Opportunities

**Systematic sensitivity analysis.** Shadow tracks currently show a single manual perturbation. The natural extension is a parameter sweep: vary an input assumption across a defined range and display the envelope of resulting solutions. This would give analysts a formal uncertainty bound on derived tracks — directly relevant to CPA calculations where margin has operational consequences.

**Cross-exercise reference consistency.** The STAC global refresh points toward a fleet-level capability: ensuring that when the same reference value (a vessel's known characteristics, an environmental parameter) is used across multiple exercises, all plots reflect the current authoritative value. This is an analytical hygiene capability at scale.

**Formal audit appendix.** The Analysis Log, with reference data sources resolved and currency status recorded, is the natural basis for an appendix to a formal analytical report — documenting all assumptions made, their sources, and their currency at time of analysis. This should be an explicit future output format.

---

## Resolved Design Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Source structure changes | `source-structure-changed` is a distinct currency state — source fetched successfully but selector returned no match. Requires selector correction, not a simple retry. |
| 2 | Browser add-in scope | Out of scope for now. Analyst enters URL + XPath manually. Browser add-in is a future enhancement. |
| 3 | Shadow track persistence | Always transient. Shadow tracks are a live working aid only — never saved, always cleared on session close. |
| 4 | Multiple simultaneous recalculations | Replace. A new recalculation replaces the current shadow set. No accumulation; no blocking. |
| 5 | STAC global refresh | Background job. Runs silently with a status indicator; results appear when complete. Analyst is not blocked. |
| 6 | Multiple changed sources on session open | Single batched modal listing all affected sources with per-source controls. Avoids sequential blocking interruptions. |

---

## Out of Scope (for now)

- Periodic background polling while session is open
- "Defer" option in the reference data change modal
- Per-step shadow track selection via Analysis Log checkboxes
- Mini-app export of solution comparison views
