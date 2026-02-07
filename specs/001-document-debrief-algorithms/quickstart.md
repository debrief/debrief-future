# Quickstart: Document Debrief Algorithms

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07

## Prerequisites

1. **Clone the legacy repo**: `git clone https://github.com/debrief/debrief.git`
2. **Have access to `debrief-future`**: This repo contains templates and reference specs
3. **Java environment** (optional): Only needed if using the capture harness (Approach A)
   - Java 8+ (matches Legacy Debrief)
   - Maven (for harness dependencies)

## Quick Reference

| What | Where |
|------|-------|
| Task brief | `debrief-future/docs/tool-migration/LEGACY-REPO-TASK.md` |
| Full SRD | `debrief-future/docs/tool-migration/TOOL-LIBRARY-SRD.md` |
| Spec template | `debrief-future/shared/tools/TEMPLATE.md` |
| Reference specs | `debrief-future/shared/tools/track/styling/*.md` |
| Java harness | `debrief-future/docs/tool-migration/java-harness-template/` |
| Staging directory | `debrief/debrief/_tool-migration/` (created during work) |

## Step-by-Step Workflow

### Step 1: Set Up the Staging Directory

In the legacy `debrief/debrief` repo:

```bash
mkdir -p _tool-migration/tools
```

### Step 2: Run Discovery (Phase 1)

Scan the 4 Java package roots for tool classes:

```
org.mwc.debrief.core/src/
org.mwc.debrief.track_shift/src/
org.mwc.cmap.plotViewer/src/
Debrief/
```

Look for classes matching:
- **Names**: `*Tool`, `*Action`, `*Analyzer`, `*Calculator`, `*Operation`
- **Interfaces**: `IAction`, `AbstractAction`, `IMenuCreator`
- **Methods**: Taking `Layers`, `TrackWrapper`, `WatchableList`, `FeatureCollection`

**Skip**: Dialog launchers, view factories, preference pages, menu wiring, deprecated code.

**Output**: Write `_tool-migration/discovery-report.md` following the format in `LEGACY-REPO-TASK.md`.

For each tool, record all 9 columns:
- Name (kebab-case)
- Category (domain/subdomain)
- Java Class (fully-qualified)
- Complexity (Low/Medium/High)
- Legacy Trigger (how invoked in Eclipse)
- Selection Context (what must be selected)
- Has Intermediate UI (Yes/No)
- Description (one-line)
- Status (Ready/Needs Review/Out of Scope)

### Step 3: Capture Golden I/O (Phase 2)

For each tool marked "Ready", starting with Low-complexity tools:

**Option A — Java Capture Harness** (preferred):
1. Copy harness template from `debrief-future/docs/tool-migration/java-harness-template/`
2. Add Gson 2.10.1 dependency (see `pom-fragment.xml`)
3. Write a JUnit test that runs the tool and serialises input/output
4. Run the test to generate JSON files

**Option B — Manual Construction** (fallback):
1. Read the Java source code
2. Determine what the tool does to input data
3. Manually construct input and output JSON
4. Verify by tracing through the algorithm

**Output**: Place files at `_tool-migration/tools/{category}/`:
```
{tool-name}.basic.input.json
{tool-name}.basic.output.json
```

Remember serialisation rules:
- Full floating-point precision
- UTC timestamps (Z suffix)
- GeoJSON `[longitude, latitude]`
- Deterministic collection ordering

### Step 4: Author Tool Specifications (Phase 3)

For each tool with golden I/O:

1. Read the Java source to extract the algorithm
2. Create `_tool-migration/tools/{category}/{tool-name}.1.0.md`
3. Follow the 9-section template (see `shared/tools/TEMPLATE.md`)
4. Write algorithm as pseudocode using only approved keywords
5. Reference the golden I/O files in the Examples section

Use the 4 existing specs in `shared/tools/track/styling/` as reference for tone and detail level.

### Step 5: Validate (Phase 4)

Run each spec through the 11-item checklist:

- [ ] Spec file exists at correct path
- [ ] YAML frontmatter has all 5 fields
- [ ] All 9 sections present with real content
- [ ] MCP section clear enough for LLM
- [ ] Pseudocode uses only approved keywords
- [ ] Response builders used correctly
- [ ] Result subtype matches `^[a-z_]+/[a-z_]+$`
- [ ] Golden examples exist and are referenced
- [ ] Edge cases table has 5+ entries
- [ ] `migrated_from` references legacy Java class
- [ ] Changelog records version 1.0 with date

Fix any failures and re-validate.

### Step 6: Transfer to debrief-future

Once a batch of specs passes validation:

```bash
# Copy discovery report
cp _tool-migration/discovery-report.md \
   path/to/debrief-future/docs/tool-migration/

# Copy tool specs and golden I/O
cp -r _tool-migration/tools/* \
   path/to/debrief-future/shared/tools/
```

## Priority Order

Process tools in this order:

1. **Low-complexity** tools first (build confidence in the process)
2. **Within a category** — batch related tools together
3. **High-complexity** tools last (may need domain expert input)

Recommended category order:
1. `track/styling` — reference exists; add any missing tools
2. `track/measurement` — typically Low complexity
3. `dataset/export` — typically Low complexity
4. `narrative/formatting` — typically Low complexity
5. `track/analysis` — Medium/High complexity
6. `sensor/calibration` — Medium complexity
7. `track/manipulation` — Medium/High complexity
8. `spatial/geometry` — Medium/High complexity
9. `sensor/analysis` — High complexity

## Using Claude Code Commands (in debrief-future)

If working in the `debrief-future` repo with the legacy source available:

| Command | Purpose |
|---------|---------|
| `/tool.discover [path]` | Automated discovery scan |
| `/tool.spec {name}` | Generate spec from Java analysis |
| `/tool.implement {name}` | Generate Python/TypeScript implementations |
| `/tool.verify {name}` | Validate implementations against golden I/O |

These commands are NOT available in the legacy repo. Use `LEGACY-REPO-TASK.md` inline instructions instead.

## Common Pitfalls

1. **Don't include UI plumbing** — Skip dialog launchers, but DO capture what parameters they gather
2. **Don't round floating-point values** — Use full precision in golden I/O
3. **Don't use language-specific syntax in pseudocode** — No Java `.get()`, Python `len()`, or TypeScript `?.`
4. **Don't use hyphens in result subtypes** — Use underscores: `range_bearing` not `range-bearing`
5. **Don't skip edge cases** — Every spec needs at least 5 entries covering empty input, invalid type, missing properties, null optionals, and no matching features
