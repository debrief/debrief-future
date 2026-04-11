# STAC Catalog NL Filter — Discovery PoC

Single-page React app that lets analysts discover STAC plots via natural language queries. Claude interprets the query against an embedded catalog reference and returns matching plot IDs plus filter chips.

This is a throwaway prototype — no build step, no framework, just an HTML file + inline React + the catalog embedded as a JS constant.

## Files

| File | Purpose |
|------|---------|
| `index.html`       | Entry point. Loads React/Babel from CDN, then `catalog-data.js` and `app.jsx`. |
| `catalog-data.js`  | Auto-generated JS constants: `window.CATALOG_FULL` (70 items, full slug with descriptions) and `window.CATALOG_COMPACT` (LLM-facing subset). |
| `app.jsx`          | React app. Transpiled in-browser by Babel standalone. |
| `styles.css`       | Light theme with chip colour coding per SRD §4.5. |
| `build-catalog.py` | Two-phase build: enriches `features.geojson` with per-platform metadata, then regenerates `catalog-data.js` from the enriched features. |
| `test-harness.mjs` | Headless Node runner — unit tests + typical-phrase integration tests. |

## Slug shape (v2)

`features.geojson` is the source of truth. Each TRACK feature is enriched in place (by `build-catalog.py`) with: `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`, `synthetic`. For the 10 platform IDs in the hardcoded `PLATFORM_VESSEL_MAP`, those values are authoritative; the remaining ~92 platforms get a deterministic assignment (zip alphabetically-sorted unknown IDs against each item's aggregate `debrief:track_names` / `debrief:vessel_classes`) and are flagged `synthetic: true`.

Per-item slug in `CATALOG_FULL` / `CATALOG_COMPACT`:

```jsonc
{
  "id": "core--sample",
  "title": "Saxon Warrior: Sample",
  "exercise": "Saxon Warrior",
  "plot_name": "Sample",
  "bbox": [...],
  "start_datetime": "...", "end_datetime": "...",
  "year": 1995, "duration_hours": 6.75,
  "feature_kinds": { "TRACK": 2, "NARRATIVE": 19 },
  "platform_count": 2, "narrative_count": 19,
  "platforms": [
    {
      "id": "NELSON", "name": "HMS Nelson",
      "nationality": "GB", "vessel_class": "surface/warship/frigate/type23",
      "vessel_type": "type23", "vessel_role": "frigate", "domain": "surface",
      "synthetic": false
    }
  ],
  "nationalities": ["GB"], "domains": ["surface"], "vessel_types": ["type23", "type45"],
  "has_submarine": false, "has_warship": true,
  "tags": [...], "feature_tags": [...]
}
```

The key improvement over v1: per-platform records let the LLM answer **joined queries** that were impossible before, e.g. "UK submarines" → `platforms[*]` where `nationality=="GB" AND domain=="subsurface"`. v1's flat `nationalities` + `vessel_classes` aggregates lost those joins.

`CATALOG_COMPACT` (fed to the LLM, ~65 KB) drops `description` and the per-platform `max_depth_m` / `track_duration_hours`. `CATALOG_FULL` (used for card rendering, ~130 KB) keeps everything.

## Rebuilding the catalog

```sh
python3 prototypes/stac-nl-filter/build-catalog.py --dry   # preview
python3 prototypes/stac-nl-filter/build-catalog.py         # live: rewrites features.geojson + catalog-data.js
```

## Running

There's no build step. You need a static HTTP server because Babel Standalone loads `app.jsx` via XHR (which `file://` blocks).

```sh
cd prototypes/stac-nl-filter
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Using it

1. Paste an Anthropic API key into the yellow bar at the top and click **Save**. It persists to `localStorage` under `filters:api_key`.
2. Type a query and hit Enter or click **Search**. Example queries:
   - "NATO ASW exercises in the North Atlantic with Astute-class submarines"
   - "Plots involving HMS Nelson"
   - "Multi-national training exercises after 2010"
   - "Anything with multiple narrative entries"
3. Results render as cards; the chips bar shows what the model extracted (nationality / vessel type / exercise / tag / year).
4. **Clear all** resets to browse mode.

All persistence (query, results, chips, search history) is via `window.localStorage` — see SRD §5.

## How it works

```
Analyst types query
      ↓
POST api.anthropic.com/v1/messages
  system:   search instructions + CATALOG_COMPACT JSON (no descriptions/track_names)
  messages: [{role: user, content: raw query}]
      ↓
Model returns { chips: {...}, ids: ["core--sample", ...] }
      ↓
Client resolves IDs against CATALOG_FULL and renders cards
```

The LLM never sees `description` (saved for rendering only), and the outlier `core--bulk-red-tracks` is excluded entirely — so the catalog the model reasons over is **70 items**.

## Headless test harness (`test-harness.mjs`)

A Node-based runner that exercises the same search pipeline without the browser. Useful for:
- Unit-testing the catalog / prompt / JSON-extraction plumbing
- Running typical analyst phrases end-to-end against the real LLM
- Ad-hoc one-off queries from the command line

It builds the same system prompt the browser app does, then spawns `claude -p` (from an isolated working directory, so the child session doesn't inherit CLAUDE.md or uncommitted git state) to call the model. Response JSON is parsed and IDs are resolved against `CATALOG_FULL`.

### Commands

```sh
# Unit tests only (no LLM calls — fast, offline)
node prototypes/stac-nl-filter/test-harness.mjs --unit

# Full suite: unit tests + 9 typical-phrase integration tests (LLM calls)
node prototypes/stac-nl-filter/test-harness.mjs

# Single ad-hoc query
node prototypes/stac-nl-filter/test-harness.mjs --query "plots involving Type 45 destroyers in the 2000s"
```

### Typical-phrase coverage

Integration tests validate results against fields in the v2 slug. The three rows marked **(join)** exercise per-platform queries that the v1 flat-aggregate slug could not answer:

| Test | Query | Validator |
|---|---|---|
| UK-only filter              | "Plots involving British Royal Navy ships only"               | `nationalities == ["GB"]` (strict) |
| **UK submarines (join)**    | "Plots that feature a UK submarine"                           | `platforms[*]` has `nationality=="GB" AND domain=="subsurface"` |
| **German frigates (join)**  | "German frigates"                                             | `platforms[*]` has `nationality=="DE" AND vessel_role=="frigate"` |
| NATO ASW exercises          | "NATO anti-submarine warfare training exercises"              | ≥1 result has an ASW/submarine tag |
| Multi-national ≥3 nations   | "Multi-national exercises with at least 3 different nationalities" | `nationalities.length >= 3` |
| **Type 23 frigates**        | "plots featuring Type 23 frigates"                            | `platforms[*].vessel_type=="type23"` |
| Vague query returns all     | "show me everything"                                          | Returns ≥ all-but-2 items |
| Year-range filter           | "exercises from the 1990s"                                    | `year` in 1990–1999 |
| Narrative content           | "plots with many narrative entries"                           | `narrative_count > 0` |

Last run on v2 slug: **21/21 unit + 9/9 integration passed.** Integration calls take ~6–50 s each (Sonnet 4.6).

### Requirements

- Node 18+
- `claude` CLI on PATH (from Claude Code install). The harness doesn't need `ANTHROPIC_API_KEY` — it piggy-backs on whatever auth `claude` itself uses.

## Notes / known quirks

- The app calls the Anthropic API directly from the browser with `anthropic-dangerous-direct-browser-access: true`. This exposes the API key to anyone with browser access, which is fine for a local PoC but would never ship.
- Model: `claude-sonnet-4-20250514` per SRD §3.4. Change it in `app.jsx` if needed.
- If the model wraps its JSON in markdown fences, `extractJson()` strips them; otherwise raw-JSON responses pass through unchanged.
- The harness re-declares `buildSystemPrompt()` and `extractJson()` rather than importing them from `app.jsx` (which is JSX and browser-only). If you edit one, edit the other — the prompt text must stay in sync or the tests will reflect different behaviour from the browser app.
