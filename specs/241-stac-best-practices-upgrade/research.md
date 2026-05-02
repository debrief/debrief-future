# Research: STAC 1.1.0 + best-practices upgrade

**Feature**: 241-stac-best-practices-upgrade
**Date**: 2026-05-02
**Inputs**: spec.md, ADR-028 (already merged in `docs/project_notes/decisions.md`), 2026-05-02 audit of `preview/workspace/samples/local-store/`

The spec arrives with most of the analytical work already done — ADR-028 ratified the conformance profile, the audit table fixed the gap inventory, and the User Stories named the four moving parts (Item factory, Collection factory, regeneration, browser-interop test). What remained was to decide *how* each gets implemented inside the existing `debrief-stac` shape. The decisions below close every NEEDS CLARIFICATION the technical context surfaced.

---

## Decision 1 — `processing` extension version pin

**Decision**: pin `https://stac-extensions.github.io/processing/v1.2.0/schema.json` and adopt only `processing:software` (`Map<string,string>`) and `processing:datetime` (RFC 3339 UTC).

**Rationale**: v1.2.0 is the current stable release on the official extensions registry as of 2026-05-02 and is what `stac-fields` (the library STAC Browser uses for pretty-printing) ships with. `processing:software` and `processing:datetime` are the two fields whose semantics map exactly onto our existing `debrief:provenance.tool_version` and `debrief:provenance.load_timestamp`; the optional `processing:level` / `processing:facility` / `processing:lineage` fields don't have unambiguous Debrief equivalents and would be guesswork.

**Alternatives considered**:
- *Adopt `processing:lineage` populated from `debrief:provenance_log`*: rejected — `processing:lineage` is free text and our log is structured. We'd be lossily flattening it. Better to keep `debrief:provenance_log` as the audit-trail source of record (Constitution Article III.3).
- *Wait for processing v2*: rejected — no v2 in flight on the registry; v1.2 is the long-stable choice.

---

## Decision 2 — `file` extension version pin and checksum encoding

**Decision**: pin `https://stac-extensions.github.io/file/v2.1.0/schema.json`. Encode `file:checksum` using the `multiformats` Python package (multihash representation, SHA-256 — `0x12` algorithm code + `0x20` length + 32-byte digest, hex-encoded). `file:size` is a plain integer (bytes).

**Rationale**: v2.1.0 is the registry's current stable release. The STAC spec mandates multihash encoding for `file:checksum`, not bare hex SHA-256. The `multiformats` package on PyPI (current maintained successor of the deprecated `multihash` package the spec mentions) handles the encoding correctly with no transitive C extensions, and pinning it as a `debrief-stac` dep adds a single ~50 KB pure-Python module — well within Article IX's "minimal, vetted" bar.

**Alternatives considered**:
- *Use the deprecated `multihash` package*: rejected — unmaintained, last release 2017, has a known issue with Python 3.11+ asyncio. `multiformats` is the upstream-blessed replacement.
- *Hand-roll multihash*: rejected — 8 lines of code is tempting but the spec is explicit about the wire format and a third-party reader would catch any mistake. Library handles it.
- *Ship only `file:size`, skip `file:checksum`*: documented as a fallback in the spec's edge cases, but not the primary plan. Both fields together prove integrity; size alone doesn't.

---

## Decision 3 — `created` recovery for the existing 73 items

**Decision**: regeneration script computes `created` per item as the UTC ISO 8601 timestamp of the item's git introduction (`git log --diff-filter=A --format=%aI -- "{path}/item.json" | tail -1`), with a fallback to filesystem mtime when git history reports nothing. `updated` is set to the regeneration timestamp.

**Rationale**: the spec's edge case explicitly forbids overwriting `created` with the regeneration time (would falsely backdate every plot to mid-2026). Git introduction time is the most accurate "when did this plot first exist in our world" we have for items born of #144 + #184. The `--diff-filter=A` picks the commit that *added* the file, which is what `created` semantically means. `tail -1` is needed because `git log` reports newest-first by default; the *first* commit (oldest) is the introduction.

**Alternatives considered**:
- *Use `properties.datetime` (the plot's mission datetime)*: rejected — `created` is the catalog metadata's lifecycle, not the captured event. Mixing them would make `created` jump backwards to 1995 for historical exercises.
- *Use a single global `created` (commit date of regeneration PR)*: rejected — same false-backdate problem at the per-item level. Stakeholders looking at the catalog's "newest plot" sort order would see all 73 collapse onto one timestamp.

---

## Decision 4 — `license` value and `providers[]` content

**Decision**:
- `license = "other"` at both Item and Collection level for the bundled sample catalog. Add a single `links[]` entry with `rel: "license"`, `href: "https://debrief.info/license/sample-catalog"`, `type: "text/html"`, `title: "Debrief sample catalog license"` — page does not need to exist yet (link target is informational).
- `providers[]` for the sample catalog: one entry, `{ "name": "Debrief", "roles": ["producer", "host"], "url": "https://debrief.info" }`. Item-level `providers` carry the same single entry by default; downstream contrib catalogs can override.

**Rationale**: `"proprietary"` was deprecated in STAC 1.1 because it conveys nothing rendering-wise — STAC Browser shows it as plain text with no link. `"other"` plus a `cite-as`/`license` link tells consumers "see this URL for terms" and is the spec-blessed escape hatch when the data isn't under a recognised SPDX licence. Sample data is for-Debrief-use-only, not redistributable, which is what we want to convey.

**Alternatives considered**:
- *Pick an SPDX value like `"CC-BY-4.0"`*: rejected — sample data is not actually under CC-BY. Misrepresenting the licence is worse than `"other"`.
- *Omit `license` entirely*: rejected — the STAC 1.1 Collection Schema requires `license` as a top-level field, and Item-level `license` is a recommended best practice (and the audit shows zero coverage).
- *Make `providers` an empty array*: rejected — `providers[]` exists to attribute the data; an empty array is a code smell. The single-entry default is the lowest-friction baseline.

---

## Decision 5 — `item_assets` shape

**Decision**: the Collection's `item_assets` block declares five logical asset types every Item *may* expose:

| Key | `type` | `roles` | `title` |
|---|---|---|---|
| `features` | `application/geo+json` | `["data"]` | `Plot features` |
| `thumbnail` | `image/png` | `["thumbnail"]` | `Thumbnail (200×150)` |
| `overview` | `image/png` | `["overview"]` | `Overview (800×600)` |
| `source` | (omitted — varies per item) | `["source"]` | `Source data (placeholder; per-item keys are `source-*`)` |
| `scene-thumbnail` | `image/png` | `["thumbnail"]` | `Storyboard scene thumbnail (placeholder; per-scene keys are `scene-thumbnail-*` and `scene-thumbnail-*-sm`)` |

The Item-shape contract's `patternProperties` accepts both `^source(-.+)?$` (existing) and `^scene-thumbnail(-.+)?$` (new) so storyboard-derived assets validate without requiring full enumeration in `item_assets`.

**Rationale**: `item_assets` is a contract block — it describes what every Item *should* have, not what specific files live where. The four core logical types (`features`, `thumbnail`, `overview`, `source`) are stable across all 73 items. The fifth (`scene-thumbnail`) is included as an explicit placeholder because `apps/vscode/src/services/sceneThumbnailService.ts` writes per-scene assets keyed `scene-thumbnail-{ulid}` and `scene-thumbnail-{ulid}-sm` into the same `item.json.assets` namespace; without declaring the placeholder, the Item contract would over-reject any plot with storyboard scenes (review issue 5A). Per-item key disambiguation via suffix is the same convention used for `source-*`. `stac-fields` and STAC Browser tolerate the suffix-pattern convention without complaint.

**Alternatives considered**:
- *Wildcard `source-*` syntax in `item_assets`*: rejected — not part of the spec; would invite reader confusion.
- *Declare every per-item source key in `item_assets`*: rejected — `item_assets` would balloon to dozens of entries describing one-of-a-kind files. The block is meant to declare a contract, not an inventory.
- *Loosen the contract schema to allow arbitrary asset keys*: rejected — loses the validation we get from explicit pattern matching. Declaring `^scene-thumbnail(-.+)?$` keeps the schema strict where it can be while accommodating the storyboard-internal namespace. A future spec (B-241-followup-2) will fold per-scene assets into a first-class LinkML-modelled shape.

---

## Decision 6 — Thumbnail rename: rename or rekey?

**Decision**: rename files. The 800×600 PNG (currently `thumbnail.png` on disk) is renamed via `git mv` to `overview.png`. The 200×150 PNG (currently `thumbnail-sm.png`) is renamed via `git mv` to `thumbnail.png`. Asset `href` values are updated to match, so `assets.thumbnail.href` now points to `./thumbnail.png` (the small one) and `assets.overview.href` points to `./overview.png` (the large one).

**Rationale**: (a) On-disk filenames now mirror their STAC role — easier for any contributor reading the catalog directly. (b) The current `thumbnail-sm` suffix becomes a vestigial naming choice; renaming purges it. (c) `git mv` preserves blame history through the rename. (d) The factory's thumbnail-emit code (`thumbnails.py`) gets the same naming on go-forward, so new plots and old regenerated plots share filenames.

**Alternatives considered**:
- *Keep filenames, just rekey*: simpler patch, but leaves `thumbnail-sm.png` on disk forever. Filename and asset key would disagree, costing future contributors a head-scratch.
- *Delete + re-emit during regeneration*: rejected — destroys git history of the PNGs and wastes capture cycles. The spec's edge case explicitly forbids re-running the capture pipeline.

---

## Decision 7 — STAC Browser version pin and serving harness (revised — review decision 4A)

**Decision**:
- **Vendor `radiantearth/stac-browser` v3.3.4 as a prebuilt static dist**, committed to the repository at `apps/web-shell/test-fixtures/stac-browser-v3.3.4/`. The dist is the output of running stac-browser's own `npm run build` once, configured to read the catalog from a relative URL. A small refresh script `scripts/refresh-stac-browser-fixture.sh` documents how to regenerate the fixture when bumping versions; the script itself is not run by CI.
- The Playwright test serves both the catalog and the stac-browser dist statically via `http-server` (added as a dev-dep on the Playwright workspace) — catalog on port `4080`, stac-browser on port `8080`. Both servers are started in `globalSetup` and torn down in `globalTeardown`. Test navigates to `http://localhost:8080/?catalogUrl=http://localhost:4080/catalog.json`.

**Rationale**: vendoring the prebuilt dist makes the test offline-clean (Article I.1) and reproducible across machines (Article I.4) — there is no `pnpm dlx` cold-start, no registry round-trip, no version drift between dev and CI. Bundle size is ~5 MB committed, which is acceptable for a test fixture and is the cost of being able to claim "this catalog renders in `stac-browser`" with a deterministic test. The 60 s budget (FR-026) is comfortably hit because there's no install step on the critical path. Using `http-server` (already familiar in the npm ecosystem) keeps the harness simple — the tool's only job is to serve static files with permissive CORS.

**Alternatives considered**:
- *`pnpm dlx @radiantearth/stac-browser` at test time* (the original draft): rejected — registry round-trip on every fresh CI worker / sandbox; cold-start is 30–60 s and can blow the FR-026 budget; flake-prone; not offline (Article I.1 violation).
- *Pin `@radiantearth/stac-browser` as a regular `devDependency` (npm install handles caching)*: better than `pnpm dlx`, but still relies on network for fresh checkouts and `pnpm install` time still consumes the budget on cold caches. Vendoring is the only path that fully satisfies Article I.1.
- *Use the public hosted instance at `https://radiantearth.github.io/stac-browser/`*: rejected — needs the catalog to be on a public CORS-permissive URL. Won't run offline. Public instance also drifts independently — tomorrow's screenshots could differ.
- *Drive a stripped-down stac-browser-equivalent snapshot test*: rejected — defeats the demo's marketing value. The spec explicitly notes "the marketing value of using the real browser is what makes this story P1".

---

## Decision 8 — Where the regeneration script lives

**Decision**: `scripts/upgrade-catalog-to-stac-1.1.py` (Python 3.11, follows the precedent of `scripts/regenerate-sample-catalog.py` and `scripts/enrich-legacy-catalog.py`). The script is committed for one PR cycle so reviewers can audit it, then deleted in a follow-up cleanup commit on the same branch (matches #228's regenerator pattern). Idempotent: a second run produces no diff.

**Rationale**: a one-shot, throwaway script keeps the long-lived codebase free of migration cruft. Inlining the migration in `debrief-stac` itself would create dead code paths once the catalog is upgraded.

**Alternatives considered**:
- *Add a `migrate v1_0 → v1_1` function inside `debrief-stac`*: rejected — the migration is a one-time event, not a runtime concern. Future plots come from the upgraded factory, not from migration.
- *Hand-edit each item.json*: rejected — 73 files, error-prone, no idempotency guarantee.

---

## Decision 9 — Schema validation harness (revised — review decision 3A)

**Decision**:
- **Vendor the official STAC 1.1 JSON Schemas** into `services/stac/tests/fixtures/stac-schemas/v1.1.0/`. Required files: `item-spec/json-schema/item.json`, `collection-spec/json-schema/collection.json`, plus the referenced sub-schemas (Asset Object, Provider Object, Link Object, etc. — `stac_validator` resolves them locally when the directory tree mirrors the spec). A small refresh script `scripts/refresh-stac-schemas.sh` documents how to bump.
- **Remove the network probe** at `services/stac/tests/test_stac_validation.py:17–23` (`urllib.request.urlopen("https://schemas.stacspec.org", timeout=2)`). Schema validation is now unconditional; failures are loud rather than silent.
- Configure `stac_validator.StacValidate()` to read schemas from the vendored directory (its `--schema_url`/`schema_map` parameter, or by setting up a local resolver). Validation runs against every regenerated Item and the Collection.

**Rationale**: the existing harness pretends to gate against STAC schemas but silently passes when offline (Article I.3 critical gap surfaced in review). Vendoring resolves both the offline-default principle (Article I.1) and the no-silent-failures principle (Article I.3) in one move. The marginal cost is a few hundred KB of JSON committed and a refresh script for future bumps. STAC 1.1 patch releases are infrequent (the 1.1.0 spec has been stable since 2024); the deliberate-bump-vs-silent-drift trade-off favours vendoring. Spec adherence claims now mean what they say.

**Alternatives considered**:
- *Cache schemas locally with monthly mtime invalidation* (the original draft): rejected — moves the failure mode to "first run after a month is offline → silent skip again". The cache approach reintroduces exactly the gap we're closing.
- *Drop the offline claim* (revise Constitution Check to acknowledge schema validation requires network): rejected — Article I.1 is non-negotiable per the constitution; downgrading our compliance claim instead of fixing the implementation is the wrong direction.
- *Run schema validation only inside the Playwright test*: rejected — moves the gate too late. CI catches it earlier this way.
- *Write our own JSON-Schema resolver*: rejected — `stac_validator` already does this work; we just need to point it at the right directory.

---

## Decision 10 — VS Code reader update scope

**Decision**: in `apps/vscode/src/types/stac.ts`, the `StacItemSummary` type's `thumbnailHref` and `thumbnailSmHref` fields are renamed to `overviewHref` (was `thumbnailHref`, holds the 800×600) and `thumbnailHref` (was `thumbnailSmHref`, holds the 200×150). All consumers are updated in lockstep — the rename is enforced by tsc's strict mode. The catalog reader reads `assets.overview.href` for the large variant and `assets.thumbnail.href` for the small variant. No backwards-compat shim is added (Article XIV — pre-release freedom).

**Rationale**: the rename moves the type closer to STAC's vocabulary, and tsc immediately surfaces every consumer that needs updating. A grep of `thumbnailHref` in `apps/vscode/` returns ~12 hits, all of which migrate cleanly. The same audit + rename applies to `shared/components/` and `apps/web-shell/`.

**Alternatives considered**:
- *Add new fields, deprecate old ones, keep both for one cycle*: rejected — explicitly out of scope per Article XIV's pre-release freedom.
- *Read both keys with a fallback (`assets.overview ?? assets.thumbnail`)*: rejected — papers over the migration and keeps confusion alive.

---

---

## Decision 11 — `saveSession.ts` parallel factory: migrate to services-side write (review decision 1B)

**Decision**: replace the direct asset-writing block in `apps/vscode/src/commands/saveSession.ts:88–110` (which currently writes `thumbnail.png` + `thumbnail-sm.png` and mutates `item.json.assets` from inside the VS Code extension) with an invocation of the upgraded `services/stac/src/debrief_stac/thumbnails.py:store_thumbnail()` factory. The extension passes the base64 PNG pair to the service via the existing IPC/MCP boundary used elsewhere; the service writes the bytes, computes `file:size`/`file:checksum`, emits `proj:shape`, refreshes `properties.updated`, and returns the updated Item shape.

**Rationale**: spec 241 already revisits every site that writes the catalog. Leaving `saveSession.ts` alone would (a) perpetuate the pre-existing Article IV.1 violation ("frontends never persist"), (b) require parallel maintenance of the new asset shape across two factories that don't share code, and (c) emit the OLD shape on day-2 saves immediately after merge — contaminating the regenerated catalog within hours. Migrating the call site is a strict prerequisite for the spec's claim that the bundled catalog speaks STAC 1.1.0 consistently. The migration is mechanical and doesn't change the user-visible save UX.

**Alternatives considered**:
- *Lockstep update only — keep saveSession.ts writing directly but match the new naming/fields* (the conservative path): rejected — solves the data-shape problem but not the architectural one. Ratchets in two factories with identical responsibilities and overlapping bug surface.
- *Document the gap and defer*: rejected per review — defers a known critical failure mode (silent shape drift) and would still require an immediate follow-up spec.
- *Refactor saveSession.ts to MCP-only* (route every asset write through the MCP tool layer): out-of-scope shape change for this spec; the lighter-touch in-process call is enough to close the violation. The MCP-everywhere migration can be a future refactor if/when it earns its way in.

---

## Decision 12 — Internal helper layout: single `_helpers.py` (review decision 2A)

**Decision**: introduce one new module `services/stac/src/debrief_stac/_helpers.py` holding the helpers added by this spec:

- `multihash_sha256(path: Path) -> str` and `multihash_sha256_bytes(data: bytes) -> str` — multihash-encoded SHA-256
- `iso_now_utc() -> str` and `normalise_to_utc(ts: str | datetime) -> str` — RFC 3339 UTC timestamp helpers
- `DEFAULT_PROVIDERS: list[Provider]` — the sample-catalog default
- `STAC_EXTENSION_PROCESSING`, `STAC_EXTENSION_FILE`, `STAC_EXTENSION_DEBRIEF` — extension URI string constants

`ITEM_ASSETS_TEMPLATE` (the Collection's `item_assets` block contents) is **inlined as a module-level constant in `collection.py`**, not in `_helpers.py` — it's only used by the Collection factory and pulling it into a shared module would create a one-caller import dependency.

**Rationale**: the original draft proposed four micro-modules (`providers.py`, `checksum.py`, `timestamps.py`, `extensions.py`) for ~50 LOC of helpers. That is over-fragmentation: each module would hold one or two functions/constants, multiplying import sites and review surfaces without any conceptual payoff. Per the engineering preferences ("minimal diff", "no premature abstraction"), a single `_helpers.py` keeps related utilities in one place and makes the import story trivial — every caller in `services/stac/` writes `from debrief_stac._helpers import ...`. The leading underscore signals these are internal; nothing outside `services/stac/` should depend on them.

**Alternatives considered**:
- *Four micro-modules* (the original draft): rejected — premature decomposition; tiny, conceptually overlapping modules.
- *Inline everything into `plot.py` and `collection.py`* (review option 2B — smallest diff): viable but the multihash and timestamp helpers are genuinely shared across `plot.py`, `assets.py`, `thumbnails.py`, and the regenerator script; pulling them into one place is the right amount of structure.
- *Put helpers in the existing `models.py`*: rejected — `models.py` is for Pydantic models, not utility functions. Mixing concerns.

---

## Open questions (none blocking)

All NEEDS CLARIFICATION items from the planning template are resolved by Decisions 1–12. No remaining unknowns.
