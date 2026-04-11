# STAC Catalog NL Filter — Discovery PoC

Single-page React app that lets analysts discover STAC plots via natural language queries. Claude interprets the query against an embedded catalog reference and returns matching plot IDs plus filter chips.

This is a throwaway prototype — no build step, no framework, just an HTML file + inline React + the catalog embedded as a JS constant.

## Files

| File | Purpose |
|------|---------|
| `index.html`       | Entry point. Loads React/Babel from CDN, then `catalog-data.js` and `app.jsx`. |
| `catalog-data.js`  | Auto-generated JS constants: `window.CATALOG_FULL` (70 items, all fields) and `window.CATALOG_COMPACT` (same items, no `description` or `track_names` — fed to the LLM). |
| `app.jsx`          | React app. Transpiled in-browser by Babel standalone. |
| `styles.css`       | Light theme with chip colour coding per SRD §4.5. |

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

The LLM never sees `description` or `track_names` (saved for rendering only), and the outlier `core--bulk-red-tracks` (300-entry track_names array) is excluded entirely — so the catalog the model reasons over is **70 items**.

## Data source

`catalog-data.js` is regenerated from `stac-metadata-only.json` at the repo root. To refresh after the catalog dump changes:

```sh
python3 -c "
import json
from pathlib import Path
meta = json.loads(Path('stac-metadata-only.json').read_text())
items = [i for i in meta['items'] if i['id'] != 'core--bulk-red-tracks']
compact = [{k: v for k, v in i.items() if k not in {'description', 'debrief:track_names'}} for i in items]
with open('prototypes/stac-nl-filter/catalog-data.js', 'w') as f:
    f.write('// Auto-generated from stac-metadata-only.json\n\n')
    f.write('window.CATALOG_FULL = '  + json.dumps(items,   indent=2) + ';\n\n')
    f.write('window.CATALOG_COMPACT = ' + json.dumps(compact, indent=2) + ';\n')
"
```

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

# Full suite: unit tests + 7 typical-phrase integration tests (LLM calls)
node prototypes/stac-nl-filter/test-harness.mjs

# Single ad-hoc query
node prototypes/stac-nl-filter/test-harness.mjs --query "plots involving Type 45 destroyers in the 2000s"
```

### Typical-phrase coverage

The integration tests cover seven query shapes and validate the results with light assertions against item fields (not exact ID matches, which would be brittle):

| Test | Query | Validator |
|---|---|---|
| UK-only filter              | "Plots involving British Royal Navy ships only"               | All results have `GB` in `debrief:nationalities` |
| NATO ASW exercises          | "NATO anti-submarine warfare training exercises"              | ≥1 result has an ASW/submarine tag |
| Submarine-specific          | "plots featuring submarines"                                  | ≥1 result has a `subsurface/...` vessel class |
| Multi-national              | "Multi-national exercises with at least 3 different nationalities" | All results have ≥3 nationalities |
| Vague query returns all     | "show me everything"                                          | Returns ≥ all-but-2 items |
| Year-range filter           | "exercises from the 1990s"                                    | All results have `start_datetime` in 1990–1999 |
| Narrative content           | "plots with many narrative entries"                           | All results have `feature_kinds.NARRATIVE > 0` |

Last run: **13/13 unit + 7/7 integration passed.** Integration calls take ~10–40 s each (Sonnet 4.6).

### Requirements

- Node 18+
- `claude` CLI on PATH (from Claude Code install). The harness doesn't need `ANTHROPIC_API_KEY` — it piggy-backs on whatever auth `claude` itself uses.

## Notes / known quirks

- The app calls the Anthropic API directly from the browser with `anthropic-dangerous-direct-browser-access: true`. This exposes the API key to anyone with browser access, which is fine for a local PoC but would never ship.
- Model: `claude-sonnet-4-20250514` per SRD §3.4. Change it in `app.jsx` if needed.
- If the model wraps its JSON in markdown fences, `extractJson()` strips them; otherwise raw-JSON responses pass through unchanged.
- The harness re-declares `buildSystemPrompt()` and `extractJson()` rather than importing them from `app.jsx` (which is JSX and browser-only). If you edit one, edit the other — the prompt text must stay in sync or the tests will reflect different behaviour from the browser app.
