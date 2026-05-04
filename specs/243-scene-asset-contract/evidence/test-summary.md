---
feature: "243-scene-asset-contract"
captured_at: "2026-05-04T10:57:06Z"
git_sha: "4e3a0cc"
tests_passed: 1882
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: Per-Scene Asset Key Contract Formalisation

## Results

| Metric | Value |
|--------|-------|
| Total Python tests | 1884 |
| Passed | 1882 |
| Failed | 0 |
| Skipped | 1 |
| xfailed (existing) | 1 |
| Coverage | not gated |

Spec-243-specific test count (subset of 1882): **34** new tests across 5
new files, plus 38 regression assertions in `test_plot.py` re-run under
the rewired contract.

## Test Breakdown — Spec 243 New Tests

### Schema-side: docstring flow-through

| Test | Status |
|------|--------|
| `test_docstring_in_jsonschema_description` | Pass |
| `test_docstring_in_pydantic_class_doc` | Pass |
| `test_docstring_in_typescript_tsdoc` | Pass |
| `test_named_rule_ids_present_in_jsonschema[scene-thumbnail-pair-rule-001]` | Pass |
| `test_named_rule_ids_present_in_jsonschema[scene-thumbnail-orphan-rule-001]` | Pass |
| `test_named_rule_ids_present_in_jsonschema[scene-thumbnail-key-format-rule-001]` | Pass |

File: `shared/schemas/tests/test_scene_thumbnail_asset_docstring.py` —
**6/6** pass. Guards FR-001, FR-002, FR-014 (US1 / SC-001 / SC-005).

### Schema-side: structural value shape

| Test | Status |
|------|--------|
| `test_valid_value_passes` | Pass |
| `test_valid_minimal_value_passes` | Pass |
| `test_missing_href_rejected` | Pass |
| `test_missing_type_rejected` | Pass |
| `test_type_not_image_png_rejected` | Pass |
| `test_missing_roles_rejected` | Pass |
| `test_additional_property_rejected` | Pass |

File: `shared/schemas/tests/test_scene_thumbnail_asset_value_shape.py` —
**7/7** pass. Guards FR-001, FR-004 (US1 / value-shape rejection cases).

### Schema-side: overlay adherence (golden fixtures)

| Test | Status |
|------|--------|
| `test_valid_fixture_passes[paired-valid.json]` | Pass |
| `test_valid_fixture_passes[coexists-with-plot-thumbnails-valid.json]` | Pass |
| `test_unpaired_fixtures_pass_overlay[unpaired-large-invalid.json]` | Pass |
| `test_unpaired_fixtures_pass_overlay[unpaired-small-invalid.json]` | Pass |
| `test_malformed_ulid_rejected` | Pass |

File: `shared/schemas/tests/test_scene_thumbnail_asset_fixtures.py` —
**5/5** pass. Documents the layer boundary (overlay enforces key format
+ value shape; pair-rule-001 is the audit module's job).

### Schema-side: round-trip (Article II / FR-012)

| Test | Status |
|------|--------|
| `test_roundtrip_preserves_full_payload` | Pass |
| `test_roundtrip_preserves_minimal_payload` | Pass |
| `test_pydantic_rejects_wrong_type` | Pass |

File: `shared/schemas/tests/test_scene_thumbnail_asset_roundtrip.py` —
**3/3** pass. Confirms Pydantic ↔ JSON ↔ TypeScript-validated parse
preserves the payload byte-for-byte.

### Service-side: audit module (US2 + US3)

| Test | Status |
|------|--------|
| `test_pairing_passes_for_valid_fixtures[paired-valid.json]` | Pass |
| `test_pairing_passes_for_valid_fixtures[coexists-with-plot-thumbnails-valid.json]` | Pass |
| `test_pairing_rejects_unpaired_large` | Pass |
| `test_pairing_rejects_unpaired_small` | Pass |
| `test_pairing_ignores_unrelated_keys` | Pass |
| `test_pairing_handles_empty_assets` | Pass |
| `test_violation_is_frozen_dataclass` | Pass |
| `test_orphan_audit_passes_when_all_ulids_match_scenes` | Pass |
| `test_orphan_audit_flags_assets_with_unknown_ulid` | Pass |
| `test_orphan_audit_ignores_unrelated_keys` | Pass |
| `test_orphan_fixture_bundle_flagged` | Pass |
| `test_non_orphan_fixture_bundle_passes` | Pass |
| `test_orphan_audit_partial_match` | Pass |

File: `services/stac/tests/test_scene_thumbnail_audit.py` — **13/13** pass.
Guards FR-005, FR-009 (US2 + US3 acceptance scenarios; SC-003).

### Regression: spec-241 contract under rewiring

| Test | Status |
|------|--------|
| `TestSpec241ItemFactoryShape::*` (4) | Pass |
| `TestSpec241CollectionShape::*` (5) | Pass |
| `TestSpec241LifecycleTimestamps::*` | Pass |
| `TestSpec241SourceAssetCoPublishing::*` | Pass |
| `TestSpec241ThumbnailPair::*` | Pass |
| `TestSpec241SourceAssetMissingPath::*` | Pass |

Files: `services/stac/tests/test_plot.py` (38), `services/stac/tests/test_collection.py` (15+).
All passing under the rewired `$ref` contract — proves SC-002 (existing
sample data continues to validate).

## Key Scenarios Verified

- **SC-001 / FR-014**: The named LinkML class docstring flows through to
  Pydantic, JSON Schema, and TypeScript outputs verbatim — a contributor
  reading any of the three artefacts can answer the four diagnostic
  questions (what / why-ULID / why-pairs / what-deletes) without grepping
  TypeScript source.
- **SC-002 / FR-009**: All existing sample-catalogue items continue to
  validate against the spec-241 contract after it was rewired to delegate
  scene-thumbnail keys via `$ref` to the new overlay. 38 regression
  assertions in `test_plot.py` confirm zero downstream breakage.
- **SC-003 / FR-011**: New invalid fixtures (`malformed-ulid-invalid.json`,
  `unpaired-large-invalid.json`, `unpaired-small-invalid.json`,
  `orphan-asset-invalid/`) are rejected — the schema overlay catches the
  malformed-ULID case via `propertyNames`, the audit module catches the
  pair / orphan cases with stable rule-ID citations.
- **Article II / FR-012**: Round-trip preserves equality; Pydantic
  rejects MIME types other than `image/png` at construction time
  (proves the LinkML `equals_string` flows through to the generated
  Pydantic class).
- **Layer boundary**: The audit-module-pass-on-unpaired tests in
  `test_scene_thumbnail_asset_fixtures.py` document the boundary — the
  schema overlay deliberately accepts unpaired sets (it can't express
  pair-rule-001 in JSON Schema); the audit module rejects them.

## Known Issues

- 1 pre-existing skipped test in unrelated `services/calc/`; not affected
  by this feature.
- 1 pre-existing xfailed test in `shared/schemas/tests/`; not affected.

## Environment

- Runner: pytest 9.0.2 (Python), pyright 1.1.408 (strict), ruff 0.13.4
- Branch: `claude/speckit-specify-243-EeQNv` (cloud session for backlog #243)
- Commit: `4e3a0cc` ("feat(243): formalise per-scene asset key contract via LinkML")
- Toolchain: `uv run pytest`, `uv run pyright`, `uv run ruff check`,
  `pnpm -r typecheck`. `pnpm lint` not gated here — pre-existing 879
  errors in `apps/vscode` are unrelated to spec 243 (verified by
  comparison with `main`); the changed file `sceneThumbnailService.ts`
  is itself lint-clean.
