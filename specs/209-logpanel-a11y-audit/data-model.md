# Data Model: LogPanel Accessibility Audit (axe-core)

**Feature**: 209-logpanel-a11y-audit
**Date**: 2026-04-24

This feature does not introduce a domain schema. The "data" here is a machine-readable audit report plus a curated human-readable report. Both formats are defined below; the JSON form has a formal JSON-Schema contract in `contracts/axe-report.schema.json`.

## Entities

### AuditRun

A single execution of the audit runner.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schema` | string literal | yes | Always `"axe-report-v2"` — distinguishes from spec-navigator's `axe-report-v1`. |
| `git_sha` | string | yes | Short HEAD SHA (first 7 chars). Sourced from `git rev-parse --short HEAD`. |
| `captured_at` | string (ISO-8601 UTC) | yes | `new Date().toISOString()` at runner start. |
| `axe_version` | string | yes | From `result.testEngine.version`. |
| `storybook_version` | string | yes | From `shared/components/package.json` `devDependencies['@storybook/react']`. |
| `storybook_url` | string | yes | URL the runner drove (e.g. `http://127.0.0.1:6006`). |
| `axe_include_selector` | string | yes | The `AxeBuilder.include(...)` selector used (`"#storybook-root"`). |
| `axe_tags` | string[] | yes | WCAG tag set (`["wcag2a","wcag2aa","wcag21aa"]`). |
| `coverage` | CoverageEntry[] | yes | One entry per `(storyId, theme)` pair attempted. |
| `findings` | Finding[] | yes | Aggregated unique violations. |

**Invariants**:
- `coverage.length === storyIds.length × themes.length` (no gaps).
- Every `finding.pairs[]` entry must reference a `coverage` row that was attempted.
- `findings` is empty iff every `coverage.violations_count === 0`.

### CoverageEntry

One cell in the audit matrix.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `story_id` | string | yes | Storybook story ID (e.g. `logpanel--timeline-default`). |
| `story_title` | string | yes | Storybook title (e.g. `"LogPanel"`). |
| `story_name` | string | yes | Story export name (e.g. `"TimelineDefault"`). |
| `import_path` | string | yes | Stories `.importPath` (e.g. `"./src/LogPanel/LogPanel.stories.tsx"`). |
| `theme` | string enum | yes | One of `"light" \| "dark" \| "vscode"`. |
| `status` | string enum | yes | `"pass" \| "fail" \| "error"`. `"pass"` = 0 violations. `"fail"` = >0 violations. `"error"` = the page could not render or axe threw. |
| `violations_count` | integer ≥ 0 | yes | 0 if `status="pass"` or `"error"`. |
| `passes_count` | integer ≥ 0 | yes | axe's passing-checks count. |
| `incomplete_count` | integer ≥ 0 | yes | axe's "incomplete" (manual-review-required) count. |
| `error` | string | no | Present iff `status="error"`. Human-readable reason. |

**State transitions**: None — CoverageEntry is immutable once written.

### Finding

A unique axe violation aggregated across all reproducing `(story, theme)` pairs.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `rule_id` | string | yes | axe rule ID (e.g. `"color-contrast"`). De-dup key. |
| `description` | string | yes | Short rule description (`result.description`). |
| `help` | string | yes | `result.help`. |
| `help_url` | string (URL) | yes | `result.helpUrl`. |
| `severity` | string enum | yes | axe `impact`: one of `"minor" \| "moderate" \| "serious" \| "critical"`. |
| `wcag_tags` | string[] | yes | Subset of axe `tags` that match the WCAG family (filter by prefix `wcag`). |
| `representative_selector` | string | yes | First DOM selector observed (`node.target[0]`). |
| `selector_varies` | boolean | yes | `true` iff not all occurrences share the same selector. |
| `pairs` | AffectedPair[] | yes | Every `(story_id, theme)` pair that reproduced this rule. |
| `classification` | string enum | yes | Human-assigned: `"fix-now" \| "accepted" \| "deferred"`. Defaults to `"fix-now"` on first observation. |
| `rationale` | string | yes | Free-form reason for the classification. Empty string allowed only when `classification="fix-now"` and no rationale needed. |
| `backlog_ref` | string | no | Required when `classification="deferred"` — a backlog row ID (e.g. `"#NNN"`). |

**Invariants**:
- `pairs.length ≥ 1`.
- If `classification === "deferred"`, `backlog_ref` MUST be set and non-empty.
- If `classification === "accepted"`, `rationale` MUST be non-empty.

### AffectedPair

A single `(story, theme)` reproduction.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `story_id` | string | yes | Matches a `CoverageEntry.story_id`. |
| `theme` | string enum | yes | Same enum as CoverageEntry.theme. |
| `selector` | string | yes | DOM selector observed in this specific pair. |
| `html_snippet` | string | no | First 500 chars of axe's `node.html`. Optional for debugging. |

### EvidenceMarkdown

The curated markdown file is derived from AuditRun but has its own structural contract (see `contracts/a11y-audit.md.template.md`). Classification + rationale live here and are the authoritative record for those fields; the JSON is regenerated from a run plus the markdown's classification map.

**Front matter (YAML)**:

```yaml
feature: "176-log-panel-ux"
audit_feature: "209-logpanel-a11y-audit"
captured_at: "2026-04-24T..."
git_sha: "abcdef1"
axe_version: "4.8.5"
storybook_version: "8.4.0"
axe_tags: ["wcag2a", "wcag2aa", "wcag21aa"]
axe_include_selector: "#storybook-root"
total_violations: 0
fix_now_remaining: 0
```

**Body sections** (in order):
1. `## Scope` — prose summary of what was audited.
2. `## Coverage Matrix` — table: rows = stories, columns = themes, cells = `✅ / ❌ / ⚠`.
3. `## Findings` — one subsection per unique rule (`rule_id`), with the fields from Finding plus the AffectedPair list and classification.
4. `## Resolved Previously` — archive section: rules that no longer appear in the current run but were tracked in earlier runs. Preserves classification history.
5. `## How to Reproduce` — one-line command + link to `quickstart.md`.

## Relationships

```
AuditRun 1 ─── n CoverageEntry
AuditRun 1 ─── n Finding
Finding  1 ─── n AffectedPair ─── 1 CoverageEntry (by story_id + theme)
```

No database; relationships are enforced at serialisation time by the post-processor.

## Validation rules (from spec requirements)

| Source | Rule |
|--------|------|
| FR-001 | Every Storybook entry matching `importPath.startsWith('./src/LogPanel/')` must appear in `coverage` for each of the three themes. |
| FR-002 | `axe_tags` MUST be a superset of `{"wcag2a","wcag2aa","wcag21aa"}`. |
| FR-003 | Curated markdown MUST exist at `specs/176-log-panel-ux/evidence/a11y-audit.md` with YAML front matter containing `git_sha`, `captured_at`, `axe_version`. |
| FR-004 | `coverage` must have no gaps (see AuditRun invariant). |
| FR-005 | Each Finding records `rule_id`, `description`, `severity`, `wcag_tags`, `pairs[]`, `representative_selector`, `help_url`. |
| FR-006 | Each Finding has a `classification` and `rationale`. Deferred findings cite `backlog_ref`. |
| FR-007 | Final run: `findings.filter(f => f.classification === "fix-now").length === 0` AND `findings.filter(f => f.severity in {"serious","critical"} && wcag_tags ⊆ wcag21aa).length === 0`. |
| FR-008 | `axe_include_selector` recorded. |
| FR-009 | `coverage` derived from Storybook `index.json`, not a static list. |
| FR-010 | Runner exit code: 0 iff no `serious`/`critical` violations at WCAG 2.1 AA; non-zero otherwise. |
| FR-012 | `@axe-core/playwright` is declared in `shared/components/package.json` `devDependencies` pinned to `^4.8.5`. |
| FR-013 | `specs/176-log-panel-ux/evidence/a11y-audit.json` is gitignored. |

## Non-entities (out of scope)

- **AxeResult (raw)**: The raw `AxeResults` objects from `@axe-core/playwright` are consumed by the post-processor but not persisted. The JSON dump is the distilled form.
- **Backlog rows**: Referenced by `backlog_ref` but not modelled here — they live in `BACKLOG.md`.
- **User / Session / etc.**: No user-data entities. The audit is developer tooling.
