# Data Model: Regenerate Blog Archive

**Feature**: 228 — Regenerate Blog Archive
**Scope**: In-memory dataclasses used by the one-shot generator. No persistent schema; no LinkML; no Pydantic (FR-009 — script is ephemeral, not part of the platform).

All dataclasses are frozen where practical and fully typed (Constitution XV). All boundary parsing validates into these types before the value is used downstream (XV.5).

---

## Entity: `SpecRecord`

Represents one `specs/NNN-<slug>/` directory after discovery and front-matter parsing.

```python
@dataclass(frozen=True)
class SpecRecord:
    number: int                        # e.g. 206
    slug: str                          # e.g. "audit-non-linkml-types"
    path: Path                         # absolute path to the spec directory
    has_shipped_post: bool
    has_opening_context: bool
    has_planning_post: bool
    front_matter: FrontMatter | None   # None iff has_shipped_post is False
    epic_prefix: str | None            # "E02" if spec title starts with "[E02]"; else None
```

**Validation rules**:
- `number` ≥ 0, three-digit when serialised.
- `slug` matches `^[a-z0-9][a-z0-9-]*$`.
- If `has_shipped_post` is True, `front_matter` MUST NOT be None.
- `epic_prefix` (when non-None) matches `^E\d{2}$`.

**Source**: filesystem walk of `specs/` plus `media/shipped-post.md` front-matter parse plus `spec.md` title scan.

---

## Entity: `FrontMatter`

Typed view of the `media/shipped-post.md` YAML front matter.

```python
@dataclass(frozen=True)
class FrontMatter:
    title: str                         # e.g. "Shipped: Log Recording Service"
    date: datetime.date                # e.g. 2026-02-09
    tags: frozenset[str]               # normalised lowercase, e.g. {"provenance", "session-state"}
    track: str | None                  # e.g. "momentum" (single string if list had one entry; joined or None otherwise)
    excerpt: str | None
    author: str | None
    layout: str | None
```

**Validation rules**:
- `title` non-empty.
- `date` in the past or today (never future — flagged in index if violated).
- `tags` stored as `frozenset` so composite-overlap comparison is O(min(|a|,|b|)); noise tags (`tracer-bullet`, `shipped`, `debrief`) are filtered at the parsing boundary, so a downstream consumer never sees them.

**Source**: `yaml.safe_load` of the front-matter block between the two `---` delimiters at the top of `shipped-post.md`.

---

## Entity: `Epic`

Represents one epic from the `BACKLOG.md` Epics table.

```python
@dataclass(frozen=True)
class Epic:
    id: str                            # "E02"
    title: str                         # "PROV Logging Implementation"
    description: str                   # raw markdown cell, may contain a link
    idea_doc_path: Path | None         # resolved docs/ideas/Exx-*.md if any
    status: Literal["proposed", "active", "complete"]
    member_spec_numbers: tuple[int, ...]  # e.g. (70, 71, 72, 73, 74, 75, 76)
```

**Validation rules**:
- `id` matches `^E\d{2}$`.
- Every `member_spec_number` resolves to exactly one `SpecRecord` (enforced at lookup; missing numbers become an Unresolved Grouping, not an exception).
- `status == "complete"` is a required gate for emitting a rollup — in-progress epics emit no rollup; their shipped members become unified posts and the pending members stay skipped.

**Source**: `BACKLOG.md` Epics-table parse (rows within `## Epics` heading) + `docs/ideas/E*.md` scan.

---

## Entity: `Classification`

The bucket assigned to each `SpecRecord` after all rules have been applied.

```python
Category = Literal["unified", "epic-member", "composite-member", "skipped"]

@dataclass(frozen=True)
class Classification:
    spec: SpecRecord
    category: Category
    reason: str                        # human-readable justification (lands in index notes)
    epic_id: str | None                # set when category == "epic-member"
    composite_id: str | None           # set when category == "composite-member"
    opener_source: Literal["cached", "synthesised", "charter-framing"]
    pr_body_source: Literal["gh", "shipped-post", "missing"]
    date_source: Literal["front-matter", "pr-merge", "git-log"]
```

**Validation rules**:
- Exactly one of `epic_id` / `composite_id` is non-None; both None means `category` is `unified` or `skipped`.
- `category == "skipped"` implies `opener_source == "cached"` is **forbidden** (no opener needed; we never generated one).
- `reason` is short prose — populated from classifier branches, no free-form strings from user input.

**Precedence rule (FR-001)**: `epic-member` → `composite-member` → `unified` → `skipped`. Encoded in the classifier as a strict early-return cascade: once a spec is bound to an epic, composite detection ignores it; once bound to a composite, unified is skipped; only specs surviving all three become unified; only specs lacking a `shipped-post.md` become skipped.

---

## Entity: `CompositeCluster`

A set of specs sharing a composite post.

```python
@dataclass(frozen=True)
class CompositeCluster:
    id: str                            # "comp-127-128" (lowest-NNN_plus-union-fingerprint)
    anchor: SpecRecord                 # the lowest-NNN member; composite-post.md lives in its media/
    members: tuple[SpecRecord, ...]    # sorted ascending by NNN
    shared_tags: frozenset[str]        # intersection across all members (for index display)
    date_span_days: int                # (max date - min date) in days; MUST be ≤ 5
```

**Validation rules**:
- `|members|` ≥ 2.
- `date_span_days` ≤ 5 (composite threshold; near-misses with 6–10 are separate `NearMiss` records, not clusters).
- `shared_tags` non-empty (post-noise-filter — see R3).
- Transitive closure under union-find: if A↔B and B↔C both qualify pairwise, A–B–C is a single cluster.

---

## Entity: `NearMiss`

A composite candidate PAIR that falls in the 6–10 day band with ≥1 shared tag.

```python
@dataclass(frozen=True)
class NearMiss:
    left: SpecRecord
    right: SpecRecord
    delta_days: int                    # 6 ≤ delta_days ≤ 10
    shared_tags: frozenset[str]
```

Near misses are reported pairwise (never merged into larger groups). Index listing shows both specs, the delta, and the shared tags so the author can promote manually before the runbook is handed off.

---

## Entity: `UnresolvedGrouping`

A surfaced mismatch that needs author adjudication.

```python
@dataclass(frozen=True)
class UnresolvedGrouping:
    kind: Literal["charter-prefix-mismatch", "legacy-charter", "near-miss", "missing-charter-member", "future-date"]
    summary: str                       # one-line title for the index
    details: str                       # markdown block for index sub-section
    cited_paths: tuple[Path, ...]      # both sides of the mismatch for easy navigation
```

**Example cases**:
- `charter-prefix-mismatch`: spec carries `[E02]` but not in E02's `Items` column (or vice versa).
- `legacy-charter`: an epic in BACKLOG has no `docs/ideas/Exx-*.md` AND no member carries the `[Ex]` prefix.
- `near-miss`: the `NearMiss` record above, rendered for the index.
- `missing-charter-member`: BACKLOG lists a spec number that has no directory under `specs/`.
- `future-date`: `shipped-post.md` front matter has a date in the future.

---

## Entity: `GeneratedPost`

One file the script will eventually promote from the temp dir.

```python
Kind = Literal["unified", "epic-rollup", "composite"]

@dataclass(frozen=True)
class GeneratedPost:
    kind: Kind
    destination: Path                  # final repo-relative path where promotion will write
    body: str                          # complete markdown (front-matter + seven sections)
    title: str                         # "Building <Feature Name>" or charter-derived
    date: datetime.date
    member_spec_numbers: tuple[int, ...]
    opener_source: Literal["cached", "synthesised", "charter-framing"]
```

**Validation rules**:
- `destination.parts` contains `media` and ends with one of `unified-post.md`, `epic-rollup.md`, `composite-post.md`.
- `title` starts with `Building ` when `kind == "unified"` or `kind == "composite"`; for `epic-rollup`, title is derived from the epic's BACKLOG title (no prefix — per Q11).
- `body` MUST contain the seven required sections: `## What We're Building`, `## How It Fits`, `## Key Decisions`, `## Screenshots`, `## By the Numbers`, `## Lessons Learned`, `## What's Next`. Sections 1–3 come verbatim from `evidence/opening-context.md` when cached; 4–7 stitched from `shipped-post.md` body + planning + research + evidence.
- **Tense-inverted twin heading stitch rule** (US1 stitcher): when the shipped-post body's first top-level heading is a past-tense twin of the cached opener's `## What We're Building` — specifically `## What We Built`, `## What Shipped`, or any `^## (What|Why|How) We ?(Built|Shipped|Delivered)` variant — the stitcher treats it as an alias for the opener's third section rather than a fourth section. It strips the duplicate heading and splices the body's opening paragraph onto the tail of `## Key Decisions` (separated by a blank line). This prevents the reader seeing "## What We're Building / … / ## What We Built / …" adjacent in the unified post.
- No existing file at `destination` (FR-007 guard enforced by the atomic writer, not by this dataclass).

---

## Entity: `ArchiveIndex`

The in-memory model of `ARCHIVE-REBUILD.md` before it is serialised.

```python
@dataclass
class ArchiveIndex:
    generated_posts: list[GeneratedPost]
    skipped_specs: list[SpecRecord]
    unresolved: list[UnresolvedGrouping]
    run_started_at: datetime.datetime  # UTC, ISO-8601
    run_completed_at: datetime.datetime
    run_tool_versions: dict[str, str]  # {"python": "3.11.x", "gh": "2.x.y" or "absent"}
```

**Serialisation contract** (what `ARCHIVE-REBUILD.md` contains):
1. H1 title + one-paragraph summary.
2. Run metadata block (start/end, tool versions) — satisfies Constitution I.4 (reproducibility).
3. **Index table** — one row per `GeneratedPost` + one row per `skipped_specs` entry (grouped under a sub-heading). Columns: `Spec`, `Category`, `Title`, `Date`, `Generated Path`, `Opener`, `PR Body Source`, `Notes`.
4. **Unresolved Groupings** section — sub-sections per `UnresolvedGrouping.kind`.
5. **Runbook** — fixed prose with four steps: (a) wipe `_posts/future/` on `debrief.github.io`, (b) copy generated files to new `_posts/future/YYYY-MM-DD-<slug>.md`, (c) adjust front matter (add `layout: future-post`, `permalink`, `excerpt` verification), (d) `bundle exec jekyll build` + deploy. Each step cites the source of its values so the website dev never needs to ask.

---

## State transitions

None of these entities have state transitions — this is a single-pass batch operation. The closest thing to state is the classifier's precedence cascade, which is a directed acyclic evaluation (not a mutable state machine).

---

## Relationships diagram

```text
          +----------------+         +----------------+
          |  SpecRecord    |<--------|  FrontMatter   |
          +----------------+         +----------------+
                 | 1 (optional)
                 v
        +-------------------+
        |   Classification  |----+
        +-------------------+    |
           |                     |
           | epic-member         | composite-member
           v                     v
     +----------+          +--------------------+
     |   Epic   |          |  CompositeCluster  |
     +----------+          +--------------------+
           |                     |  anchors / members
           v                     v
        rollup                composite
        post                  post

     (unresolved cases)    -> UnresolvedGrouping -> ArchiveIndex
     (near misses)         -> NearMiss           -> ArchiveIndex
     (all generated posts) -> GeneratedPost      -> ArchiveIndex
```

All entities terminate in the single `ArchiveIndex`, which is serialised once at the end of the run to `ARCHIVE-REBUILD.md`.
