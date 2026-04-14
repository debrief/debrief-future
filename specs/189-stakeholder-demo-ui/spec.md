# Feature Specification: Stakeholder Demo UI for NL Catalog Search

**Feature Branch**: `189-stakeholder-demo-ui`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "[E10] Stakeholder demo UI — no-build-step HTML/React playground; filter bar with NL input + CQL2 chips + card grid; NL queries produce chips that filter via the extended CQL2 engine; stakeholder-ready."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stakeholder asks a natural-language question and sees filtered results (Priority: P1)

A stakeholder opens the demo page in a browser, types a phrase like "UK submarines" into the query bar, and presses Enter. The interface responds by adding colour-coded filter chips (one per recognised dimension — nationality, domain, vessel type, etc.) above a grid of plot cards. The card grid updates to show only the plots matching the query's CQL2 filter. A results count ("18 of 72 plots") confirms the filter worked. The stakeholder understands, at a glance, what the system filtered on and why.

**Why this priority**: This is the point of the entire demo. If a stakeholder cannot type a plain-English question and see a credible filtered result, the demo has failed regardless of any other feature. Everything else in this spec is supporting scaffolding around this core interaction.

**Independent Test**: Serve the demo page from a simple static file host. In a browser, type each of 188's prototype corpus phrases (UK submarines, German frigates, Type 23 frigates, …). For each phrase, verify (a) chips appear reflecting the recognised dimensions, (b) the results count matches 188's golden baseline, (c) the card grid shows exactly the expected plots.

**Acceptance Scenarios**:

1. **Given** the demo page is loaded with the sample catalog and 188's fixture transport wired in, **When** the stakeholder types "UK submarines" and presses Enter, **Then** a nationality=GB chip and a domain=subsurface chip appear, the results count reads "18 of 72 plots", and the card grid shows 18 plot cards.
2. **Given** a stakeholder has just run a search that returned chips, **When** they click the × on one chip, **Then** that chip disappears, the remaining CQL2 filter recomputes, and the card grid + count update to reflect the broader result set.
3. **Given** an empty query bar on first page load, **When** the page finishes rendering, **Then** all 72 plot cards are visible with no chips and the results count reads "72 plots" (or equivalent), matching the unfiltered baseline.
4. **Given** a query that produces zero hits against the catalog (e.g. a filter combination with no matches), **When** it evaluates, **Then** the card grid shows an empty state with a helpful message ("No plots match. Try rephrasing — for example, 'UK submarines'.") rather than a blank area.

---

### User Story 2 - Off-corpus phrase returns helpful guidance (Priority: P2)

A stakeholder types a phrase that the hand-authored corpus does not cover (e.g. "Russian carriers", "oil tankers"). Rather than failing silently or showing a cryptic error, the UI surfaces a clear message explaining that the live LLM is offline for this demo and the corpus covers a fixed phrase set; it offers the list of supported phrases as clickable suggestions. The stakeholder can click a suggestion to see the demo in action.

**Why this priority**: Without this, the demo looks broken to anyone who deviates from the scripted phrases. A polished "sorry — here's what works" path is the difference between a demo that looks unfinished and one that looks deliberate. Second priority because it's supporting UX, not the core flow.

**Independent Test**: Type a phrase guaranteed not to be in the corpus (e.g. "purple elephants"). Verify the UI displays an informational banner with at least three clickable example phrases drawn from the corpus. Click one — confirm the query bar updates and the normal Story 1 flow executes.

**Acceptance Scenarios**:

1. **Given** a phrase not in the fixture corpus, **When** the stakeholder submits it, **Then** the UI shows a banner explaining the corpus-only nature of the demo, lists at least three supported example phrases, and does not show a scary stack-trace or 404.
2. **Given** the off-corpus banner is visible, **When** the stakeholder clicks an example phrase, **Then** the query bar populates with that phrase, the banner disappears, and the Story 1 flow executes.
3. **Given** an empty query string submitted by pressing Enter on an empty bar, **When** the request is processed, **Then** the UI simply clears any active chips and shows all cards (no banner, no error — just the unfiltered state).

---

### User Story 3 - Stakeholder inspects a plot card to understand the match (Priority: P3)

A stakeholder browsing the filtered card grid wants to verify a specific card's relevance. Each card exposes enough metadata at a glance — title, year, description snippet, nationality badge, vessel-type badge, up to three tag badges — that the stakeholder can tell why it matched the filter without opening anything. Badges for dimensions that are currently filtered on are visually emphasised so the link between chip and card is obvious.

**Why this priority**: This is polish that makes the filtered results credible and easy to scan, but the demo still works without it — all acceptance scenarios in Story 1 pass even with minimal card rendering. Third priority because it adds trust rather than enabling new behaviour.

**Independent Test**: With "UK submarines" active, visually inspect a sample of the 18 result cards. Confirm each card shows a GB nationality badge and a subsurface-domain indicator prominently. Confirm cards outside the filter do not appear.

**Acceptance Scenarios**:

1. **Given** the "Type 23 frigates" query is active and 25 cards are visible, **When** the stakeholder reads any card, **Then** the card shows a title, a year, a short description, a GB nationality badge, and a vessel-type badge reading "type23" (or the human-readable "Type 23 (Duke-class)").
2. **Given** at least one chip of each chip colour (nationality, vessel, exercise, tag, year, domain) is active in combination, **When** the stakeholder scans the chip bar, **Then** the colour semantics match the prototype convention (nationality=blue, vessel=green, exercise=purple, tag=amber, year=coral, domain=teal).
3. **Given** a card with more than three tags in the data, **When** it renders, **Then** only the first three tag badges are shown (no overflow), and no overflow indicator is strictly required.

---

### Edge Cases

- What happens when the fixture response for a corpus phrase parses successfully but its CQL2 references a catalog field that doesn't exist? The UI surfaces the same "No plots match" empty state as any zero-hit filter, without crashing. (Upstream — this would be a 188 fixture bug, not a UI bug.)
- What happens if the fixture corpus file fails to load at page startup (e.g. 404, malformed JSON)? The UI shows a blocking error banner with a reload suggestion; query bar is disabled until the fixture is available. This is the only hard-fail state.
- What happens when the user types a phrase matching the corpus but with different casing or punctuation ("UK Submarines!" vs "uk submarines")? 188's canonicalisation (phrase-normalisation on fixture lookup) should produce the same fixture hit. The UI passes the raw phrase to 188 unchanged and lets 188 handle normalisation.
- What happens when the stakeholder types very quickly and presses Enter while a previous query is still rendering? The UI cancels or ignores the in-flight result and processes the newest query; no stale chips or card lists leak through.
- What happens when the catalog is empty (zero plots loaded)? The UI shows "0 plots — check catalog data" rather than an interactive but empty demo.
- What happens on narrow mobile viewports? Out of scope — the demo is designed for desktop presentation. A graceful-ish fallback is acceptable but not a requirement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The demo MUST render as a single HTML page with no build step — React, Babel, and any other client-side dependencies load from CDN at runtime (matches the no-build constraint in the E10 epic).
- **FR-002**: On page load, the demo MUST fetch the sample catalog (as produced by #184) and render all plots in the card grid with no filter active.
- **FR-003**: The demo MUST accept a natural-language phrase via a query bar input submitted by pressing Enter (or clicking a search button, if provided).
- **FR-004**: On submission, the demo MUST call 188's `generateCql2(phrase, deps)` with 188's hand-authored fixture transport, and use the returned CQL2 to filter the in-memory catalog via #185's `filterByCql2Json`.
- **FR-005**: The demo MUST NOT invoke any live LLM provider, API endpoint, or network service other than static asset fetches for the HTML page, CDN dependencies, and the fixture + catalog JSON files. All filter logic runs offline.
- **FR-006**: Recognised dimensions from 188's returned `lozenges` MUST be displayed as colour-coded chips above the card grid, each with a remove (×) affordance. Clicking × MUST remove that chip and recompute the filter.
- **FR-007**: The demo MUST display a running count of filtered vs total plots ("N of M plots") above the card grid whenever at least one chip is active.
- **FR-008**: When the submitted phrase is not in the corpus (i.e. 188's recorded-client throws a miss), the demo MUST display a banner explaining the corpus-only nature of the demo and listing at least three clickable example phrases drawn from the corpus. The demo MUST NOT show a raw error, stack trace, or network failure message.
- **FR-009**: Clicking an example phrase in the off-corpus banner MUST populate the query bar with that phrase, dismiss the banner, and submit the query as if typed manually.
- **FR-010**: When the submitted query evaluates to zero matches against the catalog, the demo MUST display an empty-state message with a rephrasing suggestion, distinct from the off-corpus banner.
- **FR-011**: Each plot card MUST display (at minimum) title, year, a short description, a nationality indicator, a vessel-type indicator, and up to three tag badges drawn from the plot's metadata. Display formatting MUST use the platform registry's human-readable names where available.
- **FR-012**: Chip colour conventions MUST match the E10 prototype palette: nationality=blue, vessel=green, exercise=purple, tag=amber, year=coral, domain=teal.
- **FR-013**: An empty or whitespace-only query submission MUST clear all active chips and show all plots; no LLM call, no banner, no error.
- **FR-014**: The demo MUST include a "Clear all" control that removes every active chip and returns to the unfiltered state in a single action.
- **FR-015**: If the fixture corpus or sample catalog fails to load, the demo MUST show a clear, blocking error state and disable the query bar rather than silently rendering an empty or broken UI.
- **FR-016**: The demo MUST be deliverable as a static directory (HTML, JS, CSS, JSON) suitable for serving from any simple static host — no backend, no server-side rendering.

### Key Entities *(include if feature involves data)*

- **Catalog Plot**: A STAC Item record loaded from `preview/workspace/samples/local-store/`. Its properties include title, year, description, `debrief:platforms`, tags, feature_tags, and exercise name. The card grid renders one card per plot. Schema is owned by earlier E10 items (#181, #183).
- **Filter Chip**: A visual representation of one CQL2 dimension, derived from 188's `LozengeSeed` shape (field, value, negated). Rendered with colour-coding per FR-012 and a remove affordance per FR-006.
- **Generation Result**: The structured response from 188's `generateCql2`, containing `cql2` (filter expression), `lozenges` (chip descriptors), `unrecognisedTerms` (phrase fragments not matched), and diagnostic metadata. 188 owns this shape; the demo consumes it.
- **Example Phrase Suggestion**: An entry drawn from 188's hand-authored corpus, displayed in the off-corpus banner as a clickable recovery path. Sourced at runtime from the same fixture file 188's recorded client uses.

## User Interface Flow *(UI feature)*

### Decision Analysis

- **Primary Goal**: The stakeholder wants to judge whether an NL-driven catalog-search experience is credible and useful for maritime analysts. They need to see the system translate their words into a filter and produce sensible results.
- **Key Decision(s)**:
  1. Which phrase to type — scripted (from the banner suggestions) or freeform (their own wording of one of the supported dimensions).
  2. Whether a given result set is "right" — they judge this by reading card badges against the active chips.
  3. When to drill down or broaden — removing a chip versus trying a new phrase.
- **Decision Inputs**: The running results count, the chip colour legend, card-level badges that echo chip dimensions, and the off-corpus banner's example phrase list.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Initial load | Observe the page | All plots visible in grid, empty chip bar, count shows "72 plots", query bar focused |
| 2 | Query entry | Type phrase + press Enter | Brief loading indication; chips populate; grid reduces; count updates |
| 3 | Filtered results | Scan cards, scan chips | Stakeholder judges result quality against chip semantics |
| 4 | Drill-down | Click × on a chip | Chip vanishes, filter recomputes, grid expands, count rises |
| 5 | Off-corpus | Type unsupported phrase + Enter | Banner with example phrases appears; grid unchanged |
| 6 | Recover from off-corpus | Click a banner example | Query bar populates; banner dismisses; Step 2 re-runs with that phrase |
| 7 | Reset | Click "Clear all" or empty-submit | All chips cleared; grid returns to all plots; back to Step 1 |

### UI States

- **Empty State (unfiltered)**: All plots shown, empty chip bar, count "N plots", query bar focused, no banners. Helpful placeholder text in the query bar suggesting a starter phrase (e.g. "Try: UK submarines").
- **Loading State**: Brief spinner or skeleton between submit and render. Because fixture lookups are synchronous and fast, this is typically invisible; it appears only if catalog filtering takes noticeable time.
- **Filtered State**: Active chips displayed; count shows "N of M plots"; card grid restricted to matches.
- **Zero-Match State**: Chips still active but card grid replaced with empty-state card ("No plots match. Try rephrasing — for example, 'UK submarines'.") and a "Clear all" button.
- **Off-Corpus State**: Query bar holds the submitted phrase; informational banner above the chip bar shows the "corpus-only demo" message and at least three clickable example phrases. Card grid remains in whatever state it was in before the submission (no destructive change).
- **Error State**: If the fixture corpus or catalog failed to load, a blocking banner at the top of the page explains the problem, the query bar is disabled, and the card grid shows a neutral placeholder. No infinite spinners or blank white pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 prototype phrases from 188's corpus (UK submarines, German frigates, Type 23 frigates, etc.) produce the expected result counts and chip sets end-to-end through the demo UI, matching 188's golden baseline exactly.
- **SC-002**: A stakeholder previously unfamiliar with the codebase can, from a cold start, type "UK submarines", see 18 filtered cards with visible nationality=GB and domain=subsurface chips, and click one chip to broaden the filter — all within 30 seconds of page load and with no assistance beyond the on-screen text.
- **SC-003**: The off-corpus banner appears within 1 second of submitting any phrase not in the corpus, shows at least 3 supported example phrases, and recovers to a normal filtered result within one click.
- **SC-004**: The demo runs entirely offline after initial page load — no HTTP requests to any external service except CDNs (observed via browser devtools network panel); no API keys or credentials of any kind in the bundle.
- **SC-005**: The demo is deliverable as a static directory under 5 MB total (excluding CDN-loaded libraries) and serves cleanly from any vanilla static host (e.g. `python -m http.server`).
- **SC-006**: Zero `console.error` or uncaught promise rejections during any of the 9 prototype phrase runs plus 3 deliberate off-corpus runs.
- **SC-007**: `task verify` passes on the feature branch, including a Playwright smoke test that drives the demo through at least one prototype phrase end-to-end.

## Assumptions

- 188 (NL → CQL2 prompt design + hand-authored fixture corpus) is merged before this item is implemented, exposing `generateCql2`, `createRecordedLLMClient`, the fixture JSON file, and the `LozengeSeed` type as documented contracts.
- #185 (CQL2 `array_filter` evaluator) and #186 (filter-bar platform chips) are merged; `filterByCql2Json` is available and the chip-rendering conventions are established.
- #184 (regenerated sample catalog) is the authoritative data source; the demo reads it directly from `preview/workspace/samples/local-store/` or a packaged copy.
- Live-LLM transport is out of scope for this item; its presence or absence at runtime is irrelevant to #189. The demo uses only the hand-authored fixture transport from 188.
- The demo targets a desktop-class browser (Chrome/Edge/Firefox current versions). Mobile / narrow viewport support is not a requirement, though basic layout resilience is preferred.
- Stakeholder demos are hosted either locally (file://, python -m http.server) or on any static host. There is no authenticated environment assumption.
- Fixture corpus phrase list is accessible to the demo at runtime (either as a JSON export from 188 or derivable from the fixture file). Phrase surfacing in the off-corpus banner does not require a 188 API beyond what 188 already ships.
- Plot-card rendering conventions (badge shapes, colour palette) follow the E10 prototype's visual language rather than the main product's design system — this is explicitly a playground, not a production UI.
