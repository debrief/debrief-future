# Quickstart: STAC 1.1.0 + best-practices upgrade

**Feature**: 241-stac-best-practices-upgrade
**Audience**: a contributor reviewing the PR or running the migration locally

This guide gets you from a fresh `git checkout` of the merged feature branch to a fully validated STAC 1.1.0 catalog rendering in `radiantearth/stac-browser`.

---

## Prerequisites

- Python 3.11 + `uv` (see project `CLAUDE.md` → Tooling)
- Node 20.x + pnpm 9.x
- `git` 2.30+ (for `git log --diff-filter=A`)
- `task` (preferred) or you can run the four CI-equivalent commands by hand

---

## 1 — Set up the workspace

```sh
git checkout 241-stac-best-practices-upgrade
uv sync
pnpm install
```

If you hit a registry 403 in a Claude Code on the web session, see `docs/project_notes/key_facts.md` → "Network Access" — toggle to `Trusted` and start a fresh session.

---

## 2 — Run the regeneration script (once)

The script upgrades every `item.json` and the `catalog.json` under `preview/workspace/samples/local-store/`. It is **idempotent** — running it twice in a row produces zero diff.

```sh
uv run python scripts/upgrade-catalog-to-stac-1.1.py
```

Expected output (truncated):

```
[1/73] core--ambig-tracks2 — bumped stac_version, mirrored processing:*, computed file:size + file:checksum, renamed thumbnail.png → overview.png
[2/73] core--ambig-tracks3 — ...
...
[73/73] core--xyz-final — ...
catalog.json — bumped stac_version, set license=other, added providers, added item_assets, added rel=license link

Validating 73 items + 1 collection against STAC 1.1 schemas...
✓ all 73 items pass
✓ catalog.json passes

Idempotency check (re-run, expect zero diff)...
✓ no diff after second run
```

If validation fails, the script halts with a path-specific error.

---

## 3 — Verify with the regular CI gates

```sh
task verify
```

This runs lint + typecheck + tests, including:

- `services/stac/tests/test_plot.py` — Item factory contract (FR-001..FR-009)
- `services/stac/tests/test_collection.py` — Collection factory contract (FR-010..FR-014)
- `services/stac/tests/test_stac_validation.py` — official STAC 1.1 schema validation against the regenerated catalog (SC-001)
- `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts` — third-party browser interop (FR-022..FR-027)

---

## 4 — Eyeball the rendered catalog (optional)

The Playwright test serves a **vendored** prebuilt dist of `radiantearth/stac-browser` v3.3.4 from `apps/web-shell/test-fixtures/stac-browser-v3.3.4/` (committed to the repo — works offline, no `pnpm dlx` cold-start). To render it yourself:

```sh
# Terminal 1 — serve the catalog
pnpm exec http-server preview/workspace/samples/local-store -p 4080 --cors

# Terminal 2 — serve the vendored stac-browser dist
pnpm exec http-server apps/web-shell/test-fixtures/stac-browser-v3.3.4 -p 8080
```

Open `http://localhost:8080/?catalogUrl=http://localhost:4080/catalog.json`. You should see:

- Collection landing page with title, description, providers, item_assets block
- A grid of 73 plot tiles, each with a 200×150 thumbnail
- Click into one — the right-hand metadata panel pretty-prints `processing:datetime` and `file:size` / `file:checksum`
- The asset list shows `features` (data), `thumbnail`, `overview`, and `source-*` entries with role badges

---

## 5 — Inspect a single regenerated item

```sh
cat preview/workspace/samples/local-store/core--boat1/item.json | jq '{
  stac_version,
  stac_extensions,
  created: .properties.created,
  updated: .properties.updated,
  license: .properties.license,
  providers: .properties.providers,
  asset_keys: (.assets | keys),
  source_processing: .assets["source-boat1t"]["processing:software"]
}'
```

Expected (one example):

```json
{
  "stac_version": "1.1.0",
  "stac_extensions": [
    "https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json",
    "https://stac-extensions.github.io/file/v2.1.0/schema.json",
    "https://stac-extensions.github.io/processing/v1.2.0/schema.json"
  ],
  "created": "2026-04-15T13:42:08+00:00",
  "updated": "2026-05-02T10:24:11.123Z",
  "license": "other",
  "providers": [
    { "name": "Debrief", "roles": ["producer", "host"], "url": "https://debrief.info" }
  ],
  "asset_keys": ["features", "thumbnail", "overview", "source-boat1t"],
  "source_processing": { "debrief-stac": "0.1.0", "debrief-io": "0.1.0" }
}
```

---

## 6 — What the Playwright test produces

The Playwright test starts two `http-server` instances in `globalSetup` — one serving the regenerated catalog on `:4080`, one serving the vendored stac-browser dist on `:8080` — drives the navigation, asserts shape, captures three screenshots, and tears the servers down in `globalTeardown`. No network calls; entirely offline.

After `task verify` (or the targeted command):

```sh
cd apps/web-shell && node run-playwright.mjs stac-browser-interop
```

three screenshots land at:

- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-collection.png`
- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-item.png`
- `specs/241-stac-best-practices-upgrade/evidence/stac-browser-assets.png`

These are the blog post's hero artefacts. They are committed to the repository.

---

## 7 — Smoke check after merge

If you're a downstream contributor pulling `main` after this merges:

```sh
git pull
uv sync && pnpm install
task verify
```

If `task verify` is green and the catalog renders in stac-browser, you have full STAC 1.1.0 + best-practices conformance. The success criteria SC-001 through SC-008 in the spec all map onto checks that ran during `task verify`.

---

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `multiformats` not found | `uv sync` skipped because of cached lockfile | `uv sync --reinstall` |
| `git mv: fatal: not under version control` during regeneration | Working tree has uncommitted PNG changes from another branch | Stash or commit, re-run |
| Playwright test times out at 60s | First run pulling `@sparticuz/chromium`; subsequent runs are fast | Re-run; if persistent, check `apps/web-shell/run-playwright.mjs` cache dir |
| `stac_validator` reports unknown schema URL | Local schema resolver mis-configured | Schemas are vendored at `services/stac/tests/fixtures/stac-schemas/v1.1.0/` — there is no network fetch. If `stac_validator` is still trying to fetch, the resolver setup in `test_stac_validation.py` needs fixing. |
| `apps/web-shell/test-fixtures/stac-browser-v3.3.4/` missing | Fresh checkout from a stale branch, or the fixture was removed | Run `bash scripts/refresh-stac-browser-fixture.sh` to rebuild. The script clones stac-browser at v3.3.4, runs its `npm run build`, and copies `dist/` into the fixture path. |
| `created` lifted onto the wrong commit | Running migration outside a git checkout | Run inside the git work tree, not a tarball extract |
