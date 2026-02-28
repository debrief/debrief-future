# Evidence Workflow Audit

Date: 2026-02-28

## Purpose

Audit of how evidence folders are captured, consumed, and where value is being left on the table. Based on analysis of all 91 specs, 72 evidence directories, and 252 evidence files.

---

## Current State

### What Works

- **Capture infrastructure is well-designed.** The tasks template defines evidence types, minimum requirements, and feature-specific artifacts. The `speckit.tasks` command auto-generates evidence collection tasks. The `speckit.implement` command has a verification step before PR creation.
- **PR integration exists.** `speckit.pr` reads the evidence directory and formats files by type (markdown inline, JSON in collapsible blocks, images as references, CSV as tables).
- **72 of 91 specs have evidence directories.** The convention is established and followed.

### What Doesn't Work

| Problem | Severity | Scope |
|---------|----------|-------|
| Evidence consumed at exactly one point (PR body) | High | Systemic |
| 24% of specs missing `test-summary.md` | High | 22 specs |
| 25% of specs missing `usage-example.md` | High | 23 specs |
| 13% missing both mandatory files | Critical | 12 specs |
| Quality variance extreme (1–13 files per spec) | High | All specs |
| No consistent template for test-summary.md | Medium | All specs |
| Only 7.6% of specs have screenshot evidence | Medium | UI specs |
| Evidence never updated after initial capture | Medium | ~66% of specs |
| No validation that evidence matches reality | Medium | All specs |
| Content Specialist doesn't consume evidence | Medium | Media pipeline |
| No post-merge index or searchability | Low | All specs |

### Evidence Flow Today

```
speckit.tasks ──→ Plans evidence artifacts in tasks.md
                  (feature-type-aware: CLI, API, UI, Parser, etc.)
                       │
speckit.implement ──→ Creates evidence/ directory
                      Captures test-summary.md, usage-example.md
                      Captures feature-specific artifacts
                      Verifies evidence before PR
                       │
speckit.pr ──→ Reads evidence/, formats into PR body
               Spawns Content Specialist for blog post
                       │
                    ┌──┘
                    ▼
              DEAD END — nothing reads evidence after merge
```

---

## Findings

### 1. Write-Once, Read-Never

Evidence is consumed at exactly one point: the PR description. After merge:
- Content Specialist doesn't systematically read evidence files
- Project notes (decisions.md, bugs.md) don't cross-reference evidence
- CI doesn't validate evidence freshness
- No index exists across features
- No aggregation of test metrics, coverage trends, or screenshot galleries

### 2. Quality Variance Without a Rubric

Best case (085-chart-renderer): 13 files including 9 theme-variant screenshots, E2E summary, interaction evidence. Genuinely proves the feature works across all conditions.

Worst case (048-refactor-vscode-map-wrapper): Single `.gitkeep` file. Zero evidence of anything.

Median case (~28 specs): Exactly 2 files — minimal test-summary.md with pass counts and a usage-example.md. Technically compliant but adds no reviewability beyond "tests passed."

Root cause: the template says "feature-specific evidence (varies by type)" without defining what's required per type.

### 3. Inconsistent Formats

Compared 8 test-summary.md files. Found:
- Different header conventions (`# Test Summary — X` vs `# Test Summary: X`)
- Ad-hoc metadata fields (some include date, branch, runner; others don't)
- Pass rates presented as percentages, counts, tables, or prose
- No structured data extractable by tooling

### 4. Unverified Accuracy

Feature 076-replay-tune claims "56 tests, ALL PASS" then notes "5 pre-existing test files fail with `ReferenceError: describe is not defined`." Nothing validates these claims against actual test output. Evidence could be stale or aspirational.

### 5. Screenshots Are Rare and Disconnected

Only 7 of 91 specs (7.6%) include screenshots. Screenshots are rarely referenced from test-summary.md. For UI features, this means the most compelling evidence type is almost never captured.

---

## Recommendations

### Priority 1: Extract More Value From Existing Evidence

#### A. Integrate Evidence Into Content Specialist

**Change**: Update `.claude/agents/media/content.md` shipped post template to explicitly pull from evidence files.

**Mechanism**:
- Test metrics from `test-summary.md` → "Results" callout in blog post
- Code examples from `usage-example.md` → inline code blocks
- Screenshots from `evidence/screenshots/` → embedded images

**Impact**: Doubles the ROI of every evidence file with zero change to capture workflow. Creates a second consumption point.

#### B. Cross-Reference Evidence in Project Notes

**Change**: When `decisions.md` records an ADR, link to the evidence that validated it. When `bugs.md` logs a fix, reference the test-summary.md that proves it.

**Impact**: Makes institutional memory verifiable rather than anecdotal.

### Priority 2: Improve Evidence Quality at Capture Time

#### C. Machine-Readable Front Matter

**Change**: Standardize test-summary.md to include YAML front matter:

```yaml
---
feature: "085-chart-renderer"
captured_at: 2026-02-28T14:30:00Z
git_sha: abc1234
tests_passed: 47
tests_failed: 0
tests_skipped: 2
coverage_pct: 89.3
---
```

**Impact**: Enables aggregation across features, staleness detection (compare `git_sha` to HEAD), and automated dashboards. Human-readable narrative stays below the front matter.

#### D. Quality Rubric by Feature Type

**Change**: Extend the tasks template evidence section with minimum requirements per feature type:

| Feature Type | Beyond Mandatory (test-summary + usage-example) |
|---|---|
| UI Component | 3 theme screenshots (light/dark/vscode), interaction GIF or E2E summary |
| CLI Tool | `cli-demo.txt` with full session transcript |
| API/Service | `sample-request.json` + `sample-response.json` |
| Parser/Converter | Sample input + parsed output side-by-side |
| Schema Change | Round-trip proof (Python → JSON → TypeScript → JSON) |
| Infrastructure | Configuration sample + validation output |

**Impact**: Turns "capture feature-specific evidence" from vague guidance into a type-specific checklist. Addresses the 28-spec "checkbox evidence" problem.

#### E. Test-Summary Template

**Change**: Create `.specify/templates/evidence/test-summary-template.md` with required sections:

1. Front matter (see recommendation C)
2. Summary table (total/passed/failed/skipped/coverage)
3. Test breakdown by suite or category
4. Key scenarios validated (not just counts)
5. Known issues or skipped tests with rationale

**Impact**: Eliminates format inconsistency. Makes test summaries machine-parseable and human-useful.

### Priority 3: Validate and Index Evidence

#### F. Evidence Freshness Check

**Change**: Compare evidence directory's last commit date against the feature's source files. If source has been modified since evidence was captured, flag as potentially stale.

**Mechanism**: Could be a lightweight CI check or a pre-PR validation in `speckit.pr`.

**Impact**: Prevents false confidence from outdated evidence.

#### G. Evidence Index

**Change**: Generate `docs/evidence-index.md` cataloging every evidence directory — feature name, file count, file types, capture date, whether mandatory files exist.

**Mechanism**: Script run during `speckit.pr` or as a post-merge step.

**Impact**: Makes evidence searchable and auditable across the whole project.

#### H. Feed Evidence Into Release Notes

**Change**: Auto-generate CHANGELOG entries from completed specs: test metrics from `test-summary.md`, description from `usage-example.md`, first screenshot as visual.

**Impact**: Creates a third consumption point. Evidence drives the project's external narrative.

---

## Implementation Priority

If implementing three changes now:

1. **A (Content Specialist integration)** — immediate value from existing evidence, no capture changes needed
2. **C + E (Machine-readable front matter + template)** — unlocks aggregation, validation, and consistency
3. **D (Quality rubric by type)** — addresses the root cause of low-quality evidence

---

## Evidence Flow After Improvements

```
speckit.tasks ──→ Plans evidence with type-specific rubric (D)
                  Uses test-summary template (E)
                       │
speckit.implement ──→ Captures evidence with front matter (C)
                      Follows quality rubric for feature type (D)
                      Verifies freshness via git_sha (F)
                       │
speckit.pr ──→ Reads evidence/, formats into PR body
               Content Specialist pulls metrics + examples (A)
               Generates evidence index entry (G)
               Feeds CHANGELOG entry (H)
                       │
               ┌───────┼───────────┐
               ▼       ▼           ▼
          Blog post  CHANGELOG  Evidence index
          (with      (with      (searchable,
           metrics)   visuals)   auditable)
                       │
               Project notes cross-reference (B)
               Freshness validated in CI (F)
```
