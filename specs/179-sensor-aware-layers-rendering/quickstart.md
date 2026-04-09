# Quickstart — 179 Sensor-Aware Layers Rendering

**Feature**: `179-sensor-aware-layers-rendering`
**Phase**: 1 — Design & Contracts
**Audience**: developer or reviewer verifying this feature end-to-end in under 10 minutes

## TL;DR

1. Check out `179-sensor-aware-layers-rendering`
2. `pnpm install`
3. `pnpm --filter @debrief/components storybook`
4. Navigate to **Components → FeatureList → Tracks With Sensors**
5. Expand a track → expand `Sensors (N)` → expand a sensor → see contact rows with zero-padded bearings
6. Run `pnpm --filter @debrief/components test` to verify unit tests

That's the whole verification loop for reviewers who aren't running the full VS Code extension.

---

## Prerequisites

- Node.js 20.x + pnpm 9.x (project standard)
- Python 3.11 + uv (not required for this feature but required by the wider monorepo)
- Browser with ES2020 support (for Storybook)

## Step 1 — Set up the workspace

```bash
git checkout 179-sensor-aware-layers-rendering
pnpm install
```

If you're running in a cloud Claude Code session, `@sparticuz/chromium` is auto-installed via `pnpm install`. No manual Playwright browser download needed (see `docs/project_notes/playwright-installation-research.md`).

## Step 2 — Run Storybook

```bash
pnpm --filter @debrief/components storybook
```

Storybook will open at `http://localhost:6006`. Navigate to **Components → FeatureList → Tracks With Sensors**.

You should see a new story titled `TracksWithSensors` that includes fixtures for all four cases:

- **Case A**: `HMS Victory` (simple track, no sensors) — expands to flat position rows (unchanged behaviour)
- **Case B**: `Compound Track Alpha` (multiple segments, no sensors) — expands to a `Track Segments (3)` wrapper
- **Case C**: `USS Constitution` (sensors + single segment) — expands to `Positions (42)` + `Sensors (2)` group rows
- **Case D**: `Compound Contact Bravo` (sensors + multiple segments) — expands to `Track Segments (3)` + `Sensors (2)` group rows

Plus edge-case fixtures:

- `Empty Sensor Array` — sensors present but `sensors: []` (behaves as Case A/B)
- `Zero Contact Sensor` — a sensor with `contacts: []` (expands to "No contacts" placeholder)
- `Ambiguous Bearing Contact` — a contact with `ambiguous_bearing` set (renders as single row with slash-separated sublabel)
- `Large Sensor (10k Contacts)` — performance smoke test for virtualisation

## Step 3 — Interactive verification

Walk through the Case C fixture (`USS Constitution`):

1. **Expand the track row** (click chevron on `USS Constitution`)
   - Expected: two group rows appear — `Positions (42)` and `Sensors (2)`, both collapsed
   - Verify: the label includes the count in parentheses

2. **Expand the `Sensors (2)` group row**
   - Expected: two sensor rows appear — `TOWED_ARRAY` with sublabel `42 contacts` and `HULL_ARRAY` with sublabel `17 contacts`

3. **Expand `TOWED_ARRAY`**
   - Expected: 42 contact rows appear, each showing a formatted time label (e.g. `12:34:56`) and a zero-padded bearing sublabel (e.g. `045°`)
   - Verify: scroll through all 42 — no placeholder gaps, no visual glitches

4. **Click a contact row**
   - Expected: the row becomes selected; the parent `TOWED_ARRAY` row shows a child-selected dot (try collapsing `TOWED_ARRAY` to see it)

5. **Click the `Sensors (2)` group row label (not the chevron)**
   - Expected: `Sensors (2)` becomes the only selected row; the parent track row shows a child-selected dot

6. **Hover the info icon on a contact row**
   - Expected: info icon is visible (contact rows are eligible)
   - Click it: fires `onChildInfoClick` in the Storybook actions panel (or opens a popover if the host wires one up)

7. **Hover the info icon location on a sensor row**
   - Expected: **no info icon** on sensor rows (deferred per FR-017)

## Step 4 — Regression check (Case A)

Switch to the **Tracks** story (existing, not `TracksWithSensors`) and verify that a simple track with no sensors still renders exactly as before — the only visible change is that position-row courses now show as `045°` instead of `45°` (FR-018).

Run the snapshot tests:

```bash
pnpm --filter @debrief/components test flattenFeatures
```

Expected output: all existing tests pass (with course-format assertions updated to the new zero-padded format), plus all new tests pass.

## Step 5 — Run the full feature test suite

```bash
# Unit tests (Vitest)
pnpm --filter @debrief/components test

# E2E tests (Playwright against Storybook)
pnpm --filter @debrief/components test:e2e FeatureList

# Lint + typecheck
pnpm --filter @debrief/components lint
pnpm --filter @debrief/components typecheck
```

All four must pass. CI runs the same four plus Python lint/test on the full monorepo.

## Step 6 — Verify the large-contact performance story

From the `TracksWithSensors` story, select the `Large Sensor (10k Contacts)` fixture:

1. Expand the track
2. Expand `Sensors (1)`
3. Expand `LARGE_ARRAY` — this expands 10,000 contact rows
4. Scroll rapidly through the list — scroll should remain smooth (no stutter)
5. Open browser devtools → Performance → record a scroll session → verify FPS stays within 10% of a pre-change baseline

If FPS degrades significantly, the virtualisation contract (FR-011) is broken and the feature must not merge.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Group row labels don't include counts | `label` is the bare collection name | Check `flattenTrackChildren` — count must be templated into the label string |
| Case A regressed (position rows are one level deeper) | `flattenTrackChildren` is always inserting a `Positions` wrapper | Check the Case-A branch falls through without wrapping |
| Course format shows `45°` instead of `045°` | `getPositionSublabel` not updated | Update to `.padStart(3, '0')` |
| Ambiguous contact renders two sibling rows | Contact flatten loop is iterating twice for ambiguous contacts | Single row with slash-separated sublabel (FR-007) |
| Contact rows have no info icon | `FeatureRow` `type` check doesn't include `'contact'` | Add `'contact'` to the existing `displayItem.type === 'position' \|\| ...` check |
| Sensor row shows an info icon | `FeatureRow` type check includes `'sensor'` — it shouldn't | Remove `'sensor'` from the check |
| 10k contacts cause UI freeze | Sort applied at render time despite FR-016 | Remove any `.sort()` call in the contacts flatten path |

## Reviewer checklist

- [ ] Case A (simple track, no sensors) is visually unchanged except for course padding
- [ ] Case B shows a `Track Segments (N)` wrapper around segments
- [ ] Case C shows `Positions (N)` + `Sensors (N)` group rows
- [ ] Case D shows `Track Segments (N)` + `Sensors (N)` group rows
- [ ] Sensor row labels use `name` / `"N contacts"` sublabel pattern
- [ ] Contact row bearings are zero-padded (`045°`)
- [ ] Ambiguous bearings render as single row with slash separator (`045° / 225°`)
- [ ] Zero-contact sensor shows "No contacts" placeholder when expanded
- [ ] Group row click selects one path ID (no fan-out)
- [ ] Contact rows show info icon; sensor rows do not
- [ ] 10k contacts scroll smoothly (no virtualisation regression)
- [ ] All existing unit tests pass (with course-format refresh)
- [ ] New unit tests cover all 4 cases + edge cases
- [ ] Storybook screenshots captured for light/dark/vscode themes
