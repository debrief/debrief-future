#!/usr/bin/env python3
"""One-shot blog-archive regenerator (spec 228).

Walks every `specs/NNN-<slug>/` directory, classifies each into exactly one of
`unified` / `epic-member` / `composite-member` / `skipped`, and emits:

- `specs/NNN-<slug>/media/unified-post.md`         per standalone shipped spec
- `specs/<lowest-NNN-member>/media/epic-rollup.md` per complete BACKLOG epic
- `specs/<lowest-NNN-anchor>/media/composite-post.md` per composite cluster
- `ARCHIVE-REBUILD.md` at repo root — index + unresolved groupings + runbook

The script is ephemeral (FR-009): committed alongside its output and deleted in
the same PR that commits the archive. See `specs/228-regenerate-blog-archive/`.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json as _json
import logging
import re
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Literal

import yaml

if TYPE_CHECKING:
    from collections.abc import Iterator


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NOISE_TAGS: frozenset[str] = frozenset({
    # Universal project-wide markers (near every spec carries these).
    "tracer-bullet",
    "shipped",
    "debrief",
    # Horizontal tech-stack / platform markers — too broad to be a composite signal
    # (widened during the dry-run tuning pass — spec 228 Open Question).
    "stac",
    "vscode-extension",
    "vscode",
    "typescript",
    "schemas",
    "schema",
    "linkml",
    "tech-debt",
    "python",
    "architecture",
    "developer-experience",
    "ui",
    "speckit",
    "documentation",
    "testing",
    "maritime",
    # Epic-marker tags (horizontal by construction — they identify an epic, not a topic).
    "e10-catalog-discovery",
    "e10",
    "e02",
    "e03",
    "e05",
    "e08",
})

LEGACY_SHIPPED_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-shipped-.*\.md$")

EPIC_PREFIX_RE = re.compile(r"\[E(\d{2})\]")

SPEC_DIR_RE = re.compile(r"^(\d{3})-([a-z0-9][a-z0-9-]*)$")

TENSE_INVERTED_HEADING_RE = re.compile(
    r"^##\s+(?:What|Why|How)\s+We\s*(?:Built|Shipped|Delivered)\b",
    re.IGNORECASE,
)

SEVEN_SECTIONS: tuple[str, ...] = (
    "## What We're Building",
    "## How It Fits",
    "## Key Decisions",
    "## Screenshots",
    "## By the Numbers",
    "## Lessons Learned",
    "## What's Next",
)

DEFAULT_COMPOSITE_WINDOW_DAYS = 5
DEFAULT_NEAR_MISS_MAX_DAYS = 10
GH_TIMEOUT_SECONDS = 5

OPENER_SYNTHESIS_MARKER = (
    "<!-- OPENER SYNTHESISED FROM spec.md — verify before publish -->"
)

RUNBOOK_STEPS_MD: str = """\
1. **Wipe existing future posts** on `debrief.github.io`:
   ```sh
   rm debrief.github.io/_posts/future/*.md
   ```
2. **Copy generated files**: for every row in the index table, copy the file at
   `Generated Path` into `debrief.github.io/_posts/future/YYYY-MM-DD-<slug>.md`,
   where `YYYY-MM-DD` is the `Date` column and `<slug>` derives from the
   `Title` column (kebab-case, lowercased, `Building` prefix stripped).
3. **Adjust front matter** of each copied file: ensure `layout: future-post`,
   add `permalink: /future/<slug>/`, verify `excerpt` is a single sentence
   under 150 characters, and confirm `date` matches the filename.
4. **Build and deploy**:
   ```sh
   cd debrief.github.io
   bundle exec jekyll build
   # deploy via the site's normal publish path
   ```
"""


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FrontMatter:
    title: str
    date: _dt.date
    tags: frozenset[str]
    track: str | None = None
    excerpt: str | None = None
    author: str | None = None
    layout: str | None = None


@dataclass(frozen=True)
class SpecRecord:
    number: int
    slug: str
    path: Path
    shipped_post_path: Path | None
    has_opening_context: bool
    has_planning_post: bool
    front_matter: FrontMatter | None
    epic_prefix: str | None

    @property
    def has_shipped_post(self) -> bool:
        return self.shipped_post_path is not None


@dataclass(frozen=True)
class Epic:
    id: str
    title: str
    description: str
    idea_doc_path: Path | None
    status: Literal["proposed", "active", "complete"]
    member_spec_numbers: tuple[int, ...]


@dataclass(frozen=True)
class CompositeCluster:
    id: str
    anchor: SpecRecord
    members: tuple[SpecRecord, ...]
    shared_tags: frozenset[str]
    date_span_days: int


@dataclass(frozen=True)
class NearMiss:
    left: SpecRecord
    right: SpecRecord
    delta_days: int
    shared_tags: frozenset[str]


@dataclass(frozen=True)
class UnresolvedGrouping:
    kind: Literal[
        "charter-prefix-mismatch",
        "legacy-charter",
        "near-miss",
        "missing-charter-member",
        "future-date",
        "malformed-yaml",
    ]
    summary: str
    details: str
    cited_paths: tuple[Path, ...]


@dataclass(frozen=True)
class Classification:
    spec: SpecRecord
    category: Literal["unified", "epic-member", "composite-member", "skipped"]
    reason: str
    epic_id: str | None
    composite_id: str | None
    opener_source: Literal["cached", "synthesised", "charter-framing"] | None
    pr_body_source: Literal["gh", "shipped-post", "missing"] | None
    date_source: Literal["front-matter", "pr-merge", "git-log"] | None


@dataclass(frozen=True)
class GeneratedPost:
    kind: Literal["unified", "epic-rollup", "composite"]
    destination: Path
    body: str
    title: str
    date: _dt.date
    member_spec_numbers: tuple[int, ...]
    opener_source: Literal["cached", "synthesised", "charter-framing"]


@dataclass
class ArchiveIndex:
    generated_posts: list[GeneratedPost] = field(default_factory=list)
    classifications: list[Classification] = field(default_factory=list)
    skipped_specs: list[SpecRecord] = field(default_factory=list)
    unresolved: list[UnresolvedGrouping] = field(default_factory=list)
    near_misses: list[NearMiss] = field(default_factory=list)
    run_started_at: _dt.datetime = field(
        default_factory=lambda: _dt.datetime.now(tz=_dt.UTC),
    )
    run_completed_at: _dt.datetime | None = None
    run_tool_versions: dict[str, str] = field(default_factory=dict)
    run_log_lines: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# YAML front-matter parser (T014 + C11)
# ---------------------------------------------------------------------------


class FrontMatterError(ValueError):
    """Raised when a front-matter block is malformed or missing required fields."""


def parse_front_matter(path: Path) -> FrontMatter:
    text = path.read_text(encoding="utf-8")
    fm_block = _extract_front_matter_block(text)
    if fm_block is None:
        raise FrontMatterError(f"{path}: no front matter delimited by `---`")
    try:
        raw = yaml.safe_load(fm_block)
    except yaml.YAMLError as exc:
        raise FrontMatterError(f"{path}: malformed YAML: {exc}") from exc
    if not isinstance(raw, dict):
        raise FrontMatterError(f"{path}: front matter is not a mapping")

    title = raw.get("title")
    if not isinstance(title, str) or not title.strip():
        raise FrontMatterError(f"{path}: missing or non-string `title`")

    date_value = raw.get("date")
    date = _coerce_date(date_value)
    if date is None:
        raise FrontMatterError(
            f"{path}: missing or unparseable `date` (got {date_value!r})"
        )

    return FrontMatter(
        title=title.strip(),
        date=date,
        tags=_coerce_tags(raw.get("tags")),
        track=_coerce_track(raw.get("track")),
        excerpt=_optional_str(raw.get("excerpt")),
        author=_optional_str(raw.get("author")),
        layout=_optional_str(raw.get("layout")),
    )


def _extract_front_matter_block(text: str) -> str | None:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "\n".join(lines[1:idx])
    return None


def _coerce_date(value: object) -> _dt.date | None:
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    if isinstance(value, str):
        try:
            return _dt.date.fromisoformat(value.strip()[:10])
        except ValueError:
            return None
    return None


def _coerce_tags(value: object) -> frozenset[str]:
    if value is None:
        return frozenset()
    items: list[str]
    if isinstance(value, str):
        items = [value]
    elif isinstance(value, list):
        items = [v for v in value if isinstance(v, str)]
    else:
        return frozenset()
    normalised = {tag.strip().lower() for tag in items if tag.strip()}
    return frozenset(normalised - NOISE_TAGS)


def _coerce_track(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, list):
        joined = ", ".join(str(v).strip() for v in value if str(v).strip())
        return joined or None
    return None


def _optional_str(value: object) -> str | None:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return None


# ---------------------------------------------------------------------------
# Spec discovery (T019 + R7 legacy-naming patch)
# ---------------------------------------------------------------------------


def discover_specs(
    repo_root: Path,
    *,
    logger: logging.Logger | None = None,
) -> list[SpecRecord]:
    log = logger or logging.getLogger(__name__)
    specs_dir = repo_root / "specs"
    if not specs_dir.is_dir():
        raise FileNotFoundError(f"specs directory missing: {specs_dir}")

    records: list[SpecRecord] = []
    for child in sorted(specs_dir.iterdir()):
        if not child.is_dir():
            continue
        match = SPEC_DIR_RE.match(child.name)
        if not match:
            continue
        if not (child / "spec.md").is_file():
            log.debug("discover: skipping %s (no spec.md)", child.name)
            continue
        number = int(match.group(1))
        slug = match.group(2)
        shipped_post_path = _find_shipped_post(child)
        front_matter: FrontMatter | None = None
        if shipped_post_path is not None:
            try:
                front_matter = parse_front_matter(shipped_post_path)
            except FrontMatterError as exc:
                log.warning("discover: %s — %s", shipped_post_path, exc)
                front_matter = None
        records.append(
            SpecRecord(
                number=number,
                slug=slug,
                path=child,
                shipped_post_path=shipped_post_path,
                has_opening_context=(child / "evidence" / "opening-context.md").is_file(),
                has_planning_post=(child / "media" / "planning-post.md").is_file(),
                front_matter=front_matter,
                epic_prefix=_read_epic_prefix(child / "spec.md"),
            )
        )
    return records


def _find_shipped_post(spec_dir: Path) -> Path | None:
    media = spec_dir / "media"
    canonical = media / "shipped-post.md"
    if canonical.is_file():
        return canonical
    if not media.is_dir():
        return None
    dated: list[tuple[str, Path]] = []
    for entry in media.iterdir():
        if not entry.is_file():
            continue
        match = LEGACY_SHIPPED_RE.match(entry.name)
        if match is None:
            continue
        dated.append((match.group(1), entry))
    if not dated:
        return None
    dated.sort(key=lambda pair: pair[0], reverse=True)
    return dated[0][1]


def _read_epic_prefix(spec_md: Path) -> str | None:
    try:
        text = spec_md.read_text(encoding="utf-8")
    except OSError:
        return None
    for raw_line in text.splitlines()[:80]:
        line = raw_line.strip()
        if line.startswith("#"):
            match = EPIC_PREFIX_RE.search(line)
            if match:
                return f"E{match.group(1)}"
        if line.lower().startswith("**input**:") or line.lower().startswith("input:"):
            match = EPIC_PREFIX_RE.search(line)
            if match:
                return f"E{match.group(1)}"
    return None


# ---------------------------------------------------------------------------
# Ship-date resolver (T024 / R2)
# ---------------------------------------------------------------------------


DateSource = Literal["front-matter", "pr-merge", "git-log"]


def resolve_ship_date(
    spec: SpecRecord,
    *,
    repo_root: Path,
    skip_gh: bool,
    logger: logging.Logger | None = None,
) -> tuple[_dt.date | None, DateSource]:
    log = logger or logging.getLogger(__name__)
    if spec.front_matter is not None:
        return spec.front_matter.date, "front-matter"
    if not skip_gh:
        merged = _gh_merged_at(spec, logger=log)
        if merged is not None:
            return merged, "pr-merge"
    git_date = _git_log_date(spec, repo_root=repo_root, logger=log)
    if git_date is not None:
        return git_date, "git-log"
    return None, "git-log"


def _gh_merged_at(
    spec: SpecRecord,
    *,
    logger: logging.Logger,
) -> _dt.date | None:
    if shutil.which("gh") is None:
        return None
    search = f"{spec.number:03d}-{spec.slug}"
    cmd = [
        "gh", "pr", "list", "--search", search, "--state", "merged",
        "--limit", "3", "--json", "number,title,headRefName,mergedAt",
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=GH_TIMEOUT_SECONDS, check=False,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        logger.warning("gh timeout for %s: %s", spec.slug, exc)
        return None
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        prs = _json.loads(result.stdout)
    except _json.JSONDecodeError:
        return None
    if not isinstance(prs, list):
        return None
    for pr in prs:
        if not isinstance(pr, dict):
            continue
        merged_at = pr.get("mergedAt")
        if isinstance(merged_at, str) and merged_at:
            try:
                return _dt.datetime.fromisoformat(
                    merged_at.replace("Z", "+00:00"),
                ).date()
            except ValueError:
                continue
    return None


def _git_log_date(
    spec: SpecRecord,
    *,
    repo_root: Path,
    logger: logging.Logger,
) -> _dt.date | None:
    try:
        rel = spec.path.relative_to(repo_root) / "spec.md"
    except ValueError:
        return None
    cmd = ["git", "log", "-1", "--format=%cI", str(rel)]
    try:
        result = subprocess.run(
            cmd, cwd=repo_root, capture_output=True, text=True,
            timeout=GH_TIMEOUT_SECONDS, check=False,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        logger.warning("git log failed for %s: %s", spec.slug, exc)
        return None
    out = result.stdout.strip()
    if not out:
        return None
    try:
        return _dt.datetime.fromisoformat(out).date()
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# PR-body retriever (T027 / R6)
# ---------------------------------------------------------------------------


PrBodySource = Literal["gh", "shipped-post", "missing"]


def get_pr_body(
    spec: SpecRecord,
    *,
    skip_gh: bool,
    logger: logging.Logger | None = None,
) -> tuple[str, PrBodySource]:
    log = logger or logging.getLogger(__name__)
    if not skip_gh and shutil.which("gh") is not None:
        search = f"{spec.number:03d}-{spec.slug}"
        cmd = [
            "gh", "pr", "list", "--search", search, "--state", "merged",
            "--limit", "3", "--json", "number,title,headRefName,body",
        ]
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True,
                timeout=GH_TIMEOUT_SECONDS, check=False,
            )
        except (subprocess.TimeoutExpired, OSError) as exc:
            log.warning("gh body lookup failed for %s: %s", spec.slug, exc)
            result = None
        if result is not None and result.returncode == 0 and result.stdout.strip():
            try:
                prs = _json.loads(result.stdout)
            except _json.JSONDecodeError:
                prs = []
            if isinstance(prs, list):
                for pr in prs:
                    if not isinstance(pr, dict):
                        continue
                    body = pr.get("body")
                    if isinstance(body, str) and body.strip():
                        return body, "gh"
    if spec.shipped_post_path is not None:
        try:
            body = spec.shipped_post_path.read_text(encoding="utf-8")
        except OSError:
            return "", "missing"
        return body, "shipped-post"
    return "", "missing"


# ---------------------------------------------------------------------------
# Atomic writer (T030 / R5)
# ---------------------------------------------------------------------------


class NoOverwriteError(RuntimeError):
    """Raised when a staged destination already exists in the real filesystem."""


class AtomicWriter:
    def __init__(self, *, dry_run: bool, logger: logging.Logger | None = None) -> None:
        self._dry_run = dry_run
        self._logger = logger or logging.getLogger(__name__)
        self._staged: list[tuple[Path, Path]] = []
        self._temp_dir: Path | None = None

    def __enter__(self) -> AtomicWriter:
        self._temp_dir = Path(tempfile.mkdtemp(prefix="archive-rebuild-"))
        self._logger.debug("atomic: temp dir at %s", self._temp_dir)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: object,
    ) -> Literal[False]:
        try:
            if exc is not None or self._dry_run:
                self._cleanup()
                return False
            self._promote()
        finally:
            self._cleanup()
        return False

    @property
    def temp_dir(self) -> Path:
        if self._temp_dir is None:
            raise RuntimeError("AtomicWriter used outside context")
        return self._temp_dir

    def stage(self, destination: Path, content: str) -> Path:
        if destination.exists():
            raise NoOverwriteError(f"refusing to overwrite existing file: {destination}")
        staged = self._mirror(destination)
        staged.parent.mkdir(parents=True, exist_ok=True)
        staged.write_text(content, encoding="utf-8")
        self._staged.append((staged, destination))
        return staged

    def stage_overwrite(self, destination: Path, content: str) -> Path:
        staged = self._mirror(destination)
        staged.parent.mkdir(parents=True, exist_ok=True)
        staged.write_text(content, encoding="utf-8")
        self._staged.append((staged, destination))
        return staged

    def _mirror(self, destination: Path) -> Path:
        rel = destination.resolve()
        return self.temp_dir / _path_to_fingerprint(rel)

    def _promote(self) -> None:
        self._logger.info("atomic: promoting %d files", len(self._staged))
        for staged, destination in self._staged:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(staged), str(destination))

    def _cleanup(self) -> None:
        if self._temp_dir is not None and self._temp_dir.exists():
            shutil.rmtree(self._temp_dir, ignore_errors=True)
        self._temp_dir = None


def _path_to_fingerprint(path: Path) -> str:
    digest = hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:12]
    return f"{digest}-{path.name}"


# ---------------------------------------------------------------------------
# BACKLOG.md Epics table parser (T054)
# ---------------------------------------------------------------------------


def parse_backlog_epics(backlog_path: Path) -> list[Epic]:
    if not backlog_path.is_file():
        return []
    text = backlog_path.read_text(encoding="utf-8")
    section = _extract_section(text, "## Epics")
    if section is None:
        return []
    epics: list[Epic] = []
    for row in _iter_markdown_table_rows(section):
        if len(row) < 4:
            continue
        epic_id_raw = _strip_strike(row[0]).strip()
        epic_id = epic_id_raw.lstrip("#").strip()
        if not re.fullmatch(r"E\d{2}", epic_id):
            continue
        title = _strip_strike(row[1]).strip()
        description = _strip_strike(row[2]).strip()
        raw_status_cell = row[3]
        status = _parse_epic_status(raw_status_cell)
        items_cell = row[4] if len(row) > 4 else ""
        members = _parse_items_cell(items_cell)
        idea_doc = _resolve_idea_doc(backlog_path.parent, epic_id)
        epics.append(
            Epic(
                id=epic_id,
                title=title,
                description=description,
                idea_doc_path=idea_doc,
                status=status,
                member_spec_numbers=members,
            )
        )
    return epics


def _extract_section(text: str, heading: str) -> str | None:
    pattern = re.compile(
        r"^" + re.escape(heading) + r"\s*\n(.*?)(?=^##\s|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    match = pattern.search(text)
    return match.group(1) if match else None


def _iter_markdown_table_rows(section: str) -> Iterator[list[str]]:
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if not cells:
            continue
        if all(re.fullmatch(r":?-+:?", c) for c in cells if c):
            continue
        if cells[0].lower() in {"id", "epic", "epic id"}:
            continue
        yield cells


def _strip_strike(cell: str) -> str:
    return re.sub(r"~~(.*?)~~", r"\1", cell)


def _parse_epic_status(cell: str) -> Literal["proposed", "active", "complete"]:
    text = _strip_strike(cell).strip().lower()
    if "~~" in cell or "complete" in text or "shipped" in text or "done" in text:
        return "complete"
    if "active" in text or "progress" in text or "in-flight" in text:
        return "active"
    return "proposed"


def _parse_items_cell(cell: str) -> tuple[int, ...]:
    stripped = _strip_strike(cell)
    numbers: list[int] = []
    for match in re.finditer(r"#?(\d{3})", stripped):
        n = int(match.group(1))
        if n not in numbers:
            numbers.append(n)
    return tuple(numbers)


def _resolve_idea_doc(repo_root: Path, epic_id: str) -> Path | None:
    ideas = repo_root / "docs" / "ideas"
    if not ideas.is_dir():
        return None
    for candidate in sorted(ideas.glob(f"{epic_id}-*.md")):
        if candidate.is_file():
            return candidate
    return None


# ---------------------------------------------------------------------------
# Opener loader + synthesis (US1, T038)
# ---------------------------------------------------------------------------


OpenerSource = Literal["cached", "synthesised", "charter-framing"]


def load_or_synthesise_opener(spec: SpecRecord) -> tuple[str, OpenerSource]:
    cached = spec.path / "evidence" / "opening-context.md"
    if cached.is_file():
        text = cached.read_text(encoding="utf-8")
        return _strip_frontmatter(text).lstrip("\n").rstrip() + "\n", "cached"
    return synthesise_opener(spec), "synthesised"


def synthesise_opener(spec: SpecRecord) -> str:
    spec_md = spec.path / "spec.md"
    research_md = spec.path / "research.md"
    spec_text = spec_md.read_text(encoding="utf-8") if spec_md.is_file() else ""
    research_text = research_md.read_text(encoding="utf-8") if research_md.is_file() else ""

    what = _first_paragraph_of_section(spec_text, "## Summary") or _first_input_block(spec_text)
    how = _scope_in_scope_and_dependencies(spec_text)
    key = _key_decisions_from_research_or_frs(research_text, spec_text)

    parts = [
        OPENER_SYNTHESIS_MARKER,
        "",
        "## What We're Building",
        "",
        what or "_Synthesis fallback — no spec summary detected._",
        "",
        "## How It Fits",
        "",
        how or "_Synthesis fallback — no in-scope/dependencies bullets detected._",
        "",
        "## Key Decisions",
        "",
        key or "_Synthesis fallback — no research decisions or FRs detected._",
        "",
    ]
    return "\n".join(parts)


def _strip_frontmatter(text: str) -> str:
    if not text.startswith("---"):
        return text
    lines = text.splitlines()
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            return "\n".join(lines[idx + 1 :]).lstrip("\n")
    return text


def _first_paragraph_of_section(text: str, heading: str) -> str | None:
    section = _extract_section(text, heading)
    if section is None:
        return None
    for paragraph in re.split(r"\n\s*\n", section.strip()):
        stripped = paragraph.strip()
        if stripped and not stripped.startswith("#"):
            return stripped
    return None


def _first_input_block(text: str) -> str | None:
    match = re.search(
        r"^\*\*Input\*\*:\s*(?:User description:\s*)?\"?(.+?)\"?$",
        text,
        re.MULTILINE,
    )
    return match.group(1).strip() if match else None


def _scope_in_scope_and_dependencies(text: str) -> str | None:
    bullets: list[str] = []
    in_scope = _extract_section(text, "**In scope**")
    if in_scope is None:
        in_scope = _extract_section(text, "## Scope")
    if in_scope is not None:
        for line in in_scope.splitlines():
            stripped = line.strip()
            if stripped.startswith(("-", "*")):
                bullets.append(stripped)
            if len(bullets) >= 2:
                break
    deps = _extract_section(text, "## Dependencies")
    if deps is not None:
        for line in deps.splitlines():
            stripped = line.strip()
            if stripped.startswith(("-", "*")):
                bullets.append(stripped)
    return "\n".join(bullets) if bullets else None


def _key_decisions_from_research_or_frs(
    research_text: str,
    spec_text: str,
) -> str | None:
    decisions: list[str] = []
    for match in re.finditer(r"^\*\*Decision\*\*:\s*(.+)$", research_text, re.MULTILINE):
        decisions.append(f"- {match.group(1).strip()}")
        if len(decisions) >= 5:
            break
    if decisions:
        return "\n".join(decisions)
    frs: list[str] = []
    for match in re.finditer(r"^\s*-\s*\*\*FR-00[1-3]\*\*:\s*(.+)$", spec_text, re.MULTILINE):
        frs.append(f"- {match.group(1).strip()}")
    return "\n".join(frs) if frs else None


# ---------------------------------------------------------------------------
# Shipped-post body helpers
# ---------------------------------------------------------------------------


def extract_shipped_body(path: Path) -> str:
    """Return the Markdown body of a shipped post (front matter stripped)."""
    text = path.read_text(encoding="utf-8")
    return _strip_frontmatter(text).lstrip("\n")


def _split_markdown_sections(body: str) -> list[tuple[str, str]]:
    """Split a markdown body into [(heading_line, section_body), ...]."""
    sections: list[tuple[str, str]] = []
    current_heading: str | None = None
    current_lines: list[str] = []
    prefix_lines: list[str] = []
    for line in body.splitlines():
        if line.startswith("## "):
            if current_heading is not None:
                sections.append((current_heading, "\n".join(current_lines).rstrip()))
            elif prefix_lines:
                sections.append(("", "\n".join(prefix_lines).rstrip()))
                prefix_lines = []
            current_heading = line
            current_lines = []
        else:
            if current_heading is None:
                prefix_lines.append(line)
            else:
                current_lines.append(line)
    if current_heading is not None:
        sections.append((current_heading, "\n".join(current_lines).rstrip()))
    elif prefix_lines:
        sections.append(("", "\n".join(prefix_lines).rstrip()))
    return sections


# ---------------------------------------------------------------------------
# US1: Seven-section stitcher (T043)
# ---------------------------------------------------------------------------


def _strip_post_prefix(title: str) -> str:
    return re.sub(r"^(?:Shipped|Planning)\s*:\s*", "", title).strip()


def _building_title(raw_title: str) -> str:
    stripped = _strip_post_prefix(raw_title)
    if stripped.lower().startswith("building "):
        return stripped
    return f"Building {stripped}"


def _format_front_matter(
    *,
    title: str,
    date: _dt.date,
    tags: frozenset[str],
    fm: FrontMatter | None,
) -> str:
    # Preserve original tag order-ish by unioning original list with filtered set.
    lines = ["---"]
    lines.append(f"title: \"{title}\"")
    lines.append(f"date: {date.isoformat()}")
    lines.append("layout: future-post")
    author = fm.author if fm and fm.author else "Ian"
    lines.append(f"author: {author}")
    track = fm.track if fm and fm.track else "momentum"
    lines.append(f"track: {track}")
    if fm and fm.excerpt:
        escaped_excerpt = fm.excerpt.replace("\"", "'")
        lines.append(f'excerpt: "{escaped_excerpt}"')
    tag_list = sorted(tags) if tags else []
    if tag_list:
        lines.append("tags:")
        for tag in tag_list:
            lines.append(f"  - {tag}")
    lines.append("---")
    return "\n".join(lines)


def _merge_opener_with_shipped_body(opener: str, shipped_body: str) -> str:
    """Apply the tense-inverted twin heading stitch rule.

    If the first `## ...` heading in the shipped body matches the past-tense
    twin of `## What We're Building`, splice its opening paragraph onto the
    tail of `## Key Decisions` in the opener and drop the duplicate heading.
    """
    sections = _split_markdown_sections(shipped_body)
    if not sections:
        return opener.rstrip() + "\n"
    first_heading, first_body = sections[0]
    rest = sections[1:]
    if first_heading and TENSE_INVERTED_HEADING_RE.match(first_heading):
        twin_paragraph = _first_paragraph(first_body)
        opener = _append_to_key_decisions(opener, twin_paragraph)
        # Preserve the remainder of first_body so images and follow-up
        # paragraphs are not silently dropped at the splice boundary
        # (FR-005 / Issue 176-log-panel-ux).
        remainder = _body_after_first_paragraph(first_body)
        if remainder.strip():
            rest = [("", remainder), *rest]
    else:
        rest = sections

    parts = [opener.rstrip(), ""]
    for heading, section_body in rest:
        if heading:
            parts.append(heading)
        if section_body.strip():
            parts.append(section_body.rstrip())
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def _first_paragraph(text: str) -> str:
    for paragraph in re.split(r"\n\s*\n", text.strip()):
        if paragraph.strip():
            return paragraph.strip()
    return ""


def _body_after_first_paragraph(text: str) -> str:
    """Return everything after the first non-empty paragraph (preserving blank-line structure)."""
    stripped = text.strip()
    if not stripped:
        return ""
    match = re.search(r"\n\s*\n", stripped)
    if match is None:
        return ""
    return stripped[match.end():]


# ---------------------------------------------------------------------------
# Phase 231: image harvest + Jekyll path rewrite
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ImageReference:
    alt: str
    source_path: str
    rewritten_path: str
    source_spec_key: str
    line_number: int
    kind: Literal["markdown", "html"]


@dataclass(frozen=True)
class OrphanImage:
    spec_key: str
    filename: str
    relative_path: Path
    resolved_path: Path  # dedup key for symlinked evidence dirs (FR-012)


@dataclass(frozen=True)
class BrokenImageReference:
    spec_key: str
    source_path: str
    alt: str


@dataclass(frozen=True)
class MalformedImageReference:
    spec_key: str
    line_number: int
    snippet: str


_IMAGE_RE = re.compile(
    r"!\[(?P<alt>[^\]]*)\]"
    r"\((?P<path>[^)\s]+)"
    r'(?:\s+"[^"]*")?\)'
)

_HTML_IMG_RE = re.compile(
    r"<img\b[^>]*?\bsrc=(?P<q>[\"'])(?P<path>[^\"']+)(?P=q)"
    r"(?:[^>]*?\balt=[\"'](?P<alt>[^\"']*)[\"'])?",
    re.IGNORECASE,
)


def rewrite_image_path(path: str, source_spec_slug: str) -> str:
    """Convert ./evidence/... → /assets/images/future-debrief/{slug}/{basename}.

    Rules (first rule to apply wins):
    1. Scheme URIs (http://, https://, data:) → unchanged.
    2. Already absolute (/...) → unchanged.
    3. Split off ?query or #fragment suffix, preserve for reattachment.
    4. Loop-strip every leading ./ ../ evidence/ segment (FR-011).
    5. Basename-only output.
    """
    if path.startswith(("http://", "https://", "data:")):
        return path
    if path.startswith("/"):
        return path
    suffix = ""
    for sep in ("?", "#"):
        if sep in path:
            path, suffix_rest = path.split(sep, 1)
            suffix = sep + suffix_rest
            break
    changed = True
    while changed:
        changed = False
        for prefix in ("./", "../", "evidence/"):
            if path.startswith(prefix):
                path = path[len(prefix):]
                changed = True
                break
    basename = Path(path).name
    return f"/assets/images/future-debrief/{source_spec_slug}/{basename}{suffix}"


def harvest_image_refs(
    body: str,
    source_spec: SpecRecord,
) -> tuple[list[ImageReference], list[MalformedImageReference]]:
    """Scan body for markdown and HTML image references, plus unmatched ![ occurrences.

    Returns (well-formed refs in document order, malformed rows).
    """
    refs: list[ImageReference] = []
    malformed: list[MalformedImageReference] = []
    spec_key = _spec_key(source_spec)
    for lineno, line in enumerate(body.splitlines(keepends=False), start=1):
        markdown_matches = 0
        for match in _IMAGE_RE.finditer(line):
            refs.append(ImageReference(
                alt=match.group("alt"),
                source_path=match.group("path"),
                rewritten_path=rewrite_image_path(match.group("path"), spec_key),
                source_spec_key=spec_key,
                line_number=lineno,
                kind="markdown",
            ))
            markdown_matches += 1
        for match in _HTML_IMG_RE.finditer(line):
            refs.append(ImageReference(
                alt=match.group("alt") or "",
                source_path=match.group("path"),
                rewritten_path=rewrite_image_path(match.group("path"), spec_key),
                source_spec_key=spec_key,
                line_number=lineno,
                kind="html",
            ))
        raw_count = line.count("![")
        if raw_count > markdown_matches:
            snippet = line[:80] + ("…" if len(line) > 80 else "")
            for _ in range(raw_count - markdown_matches):
                malformed.append(MalformedImageReference(
                    spec_key=spec_key,
                    line_number=lineno,
                    snippet=snippet,
                ))
    return refs, malformed


def _append_to_key_decisions(opener: str, paragraph: str) -> str:
    if not paragraph:
        return opener
    marker = "## Key Decisions"
    if marker not in opener:
        return opener.rstrip() + "\n\n" + paragraph + "\n"
    head, tail = opener.split(marker, 1)
    # Split the tail at the next `## ` heading (or end) so we can inject before it.
    next_match = re.search(r"\n##\s", tail)
    if next_match is None:
        return head + marker + tail.rstrip() + "\n\n" + paragraph + "\n"
    insertion_point = next_match.start()
    return (
        head + marker + tail[:insertion_point].rstrip() + "\n\n" + paragraph + "\n" + tail[insertion_point:]
    )


def stitch_unified_post(
    *,
    spec: SpecRecord,
    opener: str,
    opener_source: OpenerSource,
    ship_date: _dt.date,
) -> GeneratedPost:
    if spec.front_matter is None or spec.shipped_post_path is None:
        raise ValueError(f"{spec.slug}: unified stitch requires shipped post + front matter")
    title = _building_title(spec.front_matter.title)
    shipped_body = extract_shipped_body(spec.shipped_post_path)
    merged = _merge_opener_with_shipped_body(opener, shipped_body)
    fm = _format_front_matter(
        title=title,
        date=ship_date,
        tags=spec.front_matter.tags,
        fm=spec.front_matter,
    )
    body = f"{fm}\n\n{merged}"
    destination = spec.path / "media" / "unified-post.md"
    return GeneratedPost(
        kind="unified",
        destination=destination,
        body=body,
        title=title,
        date=ship_date,
        member_spec_numbers=(spec.number,),
        opener_source=opener_source,
    )


# ---------------------------------------------------------------------------
# US2: Epic rollup detection + stitcher (T059–T064)
# ---------------------------------------------------------------------------


def scan_ex_prefixes(specs: list[SpecRecord]) -> dict[str, list[SpecRecord]]:
    grouped: dict[str, list[SpecRecord]] = {}
    for spec in specs:
        if spec.epic_prefix is not None:
            grouped.setdefault(spec.epic_prefix, []).append(spec)
    return grouped


def detect_charter_prefix_mismatches(
    *,
    epics: list[Epic],
    prefix_groups: dict[str, list[SpecRecord]],
    specs: list[SpecRecord],
) -> list[UnresolvedGrouping]:
    unresolved: list[UnresolvedGrouping] = []
    by_number = {s.number: s for s in specs}
    for epic in epics:
        listed = set(epic.member_spec_numbers)
        prefix_specs = {s.number for s in prefix_groups.get(epic.id, [])}
        # prefix without charter entry
        for num in prefix_specs - listed:
            spec = by_number.get(num)
            if spec is None:
                continue
            unresolved.append(
                UnresolvedGrouping(
                    kind="charter-prefix-mismatch",
                    summary=f"{spec.number:03d}-{spec.slug} carries `[{epic.id}]` but is not in BACKLOG E{epic.id[1:]}",
                    details=(
                        f"- Spec: `{spec.path}`\n"
                        f"- Epic row: `{epic.id} {epic.title}` (members listed: "
                        f"{sorted(listed)})"
                    ),
                    cited_paths=(spec.path, spec.path.parent.parent / "BACKLOG.md"),
                )
            )
        # charter entry without matching directory
        for num in listed:
            if num not in by_number:
                unresolved.append(
                    UnresolvedGrouping(
                        kind="missing-charter-member",
                        summary=f"{epic.id} lists spec {num:03d} but no directory exists",
                        details=f"- Epic `{epic.id}` Items column references missing spec {num:03d}",
                        cited_paths=(),
                    )
                )
        # legacy charter: epic with no idea doc AND no prefixed member
        if epic.idea_doc_path is None and not prefix_groups.get(epic.id):
            unresolved.append(
                UnresolvedGrouping(
                    kind="legacy-charter",
                    summary=f"{epic.id} has no `docs/ideas/{epic.id}-*.md` and no `[{epic.id}]`-prefixed members",
                    details=(
                        f"- Epic row: `{epic.id} {epic.title}`\n"
                        "- This will still produce a rollup using the BACKLOG description, "
                        "but the author may want to author a proper idea doc."
                    ),
                    cited_paths=(),
                )
            )
    return unresolved


def _epic_members(
    epic: Epic,
    specs_by_number: dict[int, list[SpecRecord]],
) -> tuple[SpecRecord, ...]:
    out: list[SpecRecord] = []
    for num in epic.member_spec_numbers:
        for spec in specs_by_number.get(num, []):
            out.append(spec)
    return tuple(out)


def stitch_epic_rollup(
    *,
    epic: Epic,
    members: tuple[SpecRecord, ...],
) -> GeneratedPost | None:
    shipped_members = [m for m in members if m.has_shipped_post and m.front_matter is not None]
    if not shipped_members:
        return None
    anchor = min(members, key=lambda s: s.number)
    latest_date = max(m.front_matter.date for m in shipped_members)  # type: ignore[union-attr]
    all_tags: set[str] = set()
    for m in shipped_members:
        assert m.front_matter is not None
        all_tags.update(m.front_matter.tags)
    opener_text = _epic_opener(epic)

    body_lines: list[str] = []
    body_lines.append(opener_text.rstrip())
    body_lines.append("")
    body_lines.append("## Members")
    body_lines.append("")
    for m in sorted(members, key=lambda s: s.number):
        link = f"[{m.number:03d}-{m.slug}]({_relative_spec_path(m)})"
        ship = (
            m.front_matter.date.isoformat()
            if m.front_matter is not None
            else "(not shipped)"
        )
        body_lines.append(f"- {link} — {ship}")
    body_lines.append("")
    body_lines.append("## Member Features")
    body_lines.append("")
    for m in sorted(shipped_members, key=lambda s: s.number):
        assert m.shipped_post_path is not None
        assert m.front_matter is not None
        member_body = extract_shipped_body(m.shipped_post_path)
        refs, _malformed = harvest_image_refs(member_body, m)
        header = f"### {m.number:03d}-{m.slug} — {m.front_matter.date.isoformat()}"
        body_lines.append(header)
        body_lines.append("")
        intro = _first_paragraph(member_body)
        if intro:
            body_lines.append(intro)
            body_lines.append("")
        if refs:
            body_lines.append("#### Screenshots")
            body_lines.append("")
            for ref in refs:
                body_lines.append(f"![{ref.alt}]({ref.rewritten_path})")
            body_lines.append("")
    body_lines.append("## What Shipped")
    body_lines.append("")
    body_lines.append(
        f"Across {len(shipped_members)} shipped member specs, the {epic.id} epic covers "
        f"{epic.title}. See the member list for individual ship dates and detail."
    )
    body_lines.append("")

    fm = _format_front_matter(
        title=epic.title,
        date=latest_date,
        tags=frozenset(all_tags),
        fm=None,
    )
    body = f"{fm}\n\n" + "\n".join(body_lines).rstrip() + "\n"
    destination = anchor.path / "media" / "epic-rollup.md"
    return GeneratedPost(
        kind="epic-rollup",
        destination=destination,
        body=body,
        title=epic.title,
        date=latest_date,
        member_spec_numbers=tuple(sorted(m.number for m in members)),
        opener_source="charter-framing",
    )


def _epic_opener(epic: Epic) -> str:
    if epic.idea_doc_path is not None:
        try:
            text = epic.idea_doc_path.read_text(encoding="utf-8")
        except OSError:
            text = ""
        if text.strip():
            return _strip_frontmatter(text).strip()
    return f"## Overview\n\n{epic.description}"


def _relative_spec_path(spec: SpecRecord) -> str:
    try:
        rel = spec.path.relative_to(spec.path.parent.parent)
        return str(rel)
    except ValueError:
        return str(spec.path)


# ---------------------------------------------------------------------------
# US3: Composite detector, clusterer, stitcher (T073–T084)
# ---------------------------------------------------------------------------


def find_composite_pairs(
    specs: list[SpecRecord],
    *,
    window_days: int,
) -> list[tuple[SpecRecord, SpecRecord, frozenset[str]]]:
    shipped = [s for s in specs if s.front_matter is not None]
    pairs: list[tuple[SpecRecord, SpecRecord, frozenset[str]]] = []
    shipped.sort(key=lambda s: (s.front_matter.date, s.number))  # type: ignore[union-attr]
    for i, left in enumerate(shipped):
        for right in shipped[i + 1 :]:
            assert left.front_matter is not None and right.front_matter is not None
            delta = abs((right.front_matter.date - left.front_matter.date).days)
            if delta > window_days:
                if left.front_matter.date < right.front_matter.date and delta > window_days:
                    continue
                continue
            shared = left.front_matter.tags & right.front_matter.tags
            if not shared:
                continue
            if left.number <= right.number:
                pairs.append((left, right, shared))
            else:
                pairs.append((right, left, shared))
    return pairs


def cluster_composites(
    pairs: list[tuple[SpecRecord, SpecRecord, frozenset[str]]],
) -> list[CompositeCluster]:
    parent: dict[str, str] = {}

    def find(x: str) -> str:
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    specs_by_key: dict[str, SpecRecord] = {}
    for left, right, _shared in pairs:
        lk, rk = _spec_key(left), _spec_key(right)
        union(lk, rk)
        specs_by_key[lk] = left
        specs_by_key[rk] = right

    groups: dict[str, list[SpecRecord]] = {}
    for key, spec in specs_by_key.items():
        groups.setdefault(find(key), []).append(spec)

    clusters: list[CompositeCluster] = []
    for members in groups.values():
        if len(members) < 2:
            continue
        members_sorted = tuple(sorted(members, key=lambda s: s.number))
        anchor = members_sorted[0]
        shared: set[str] | None = None
        for m in members_sorted:
            assert m.front_matter is not None
            if shared is None:
                shared = set(m.front_matter.tags)
            else:
                shared &= m.front_matter.tags
        ship_dates = [m.front_matter.date for m in members_sorted if m.front_matter is not None]
        span = (max(ship_dates) - min(ship_dates)).days if ship_dates else 0
        numbers = "-".join(f"{m.number:03d}" for m in members_sorted)
        clusters.append(
            CompositeCluster(
                id=f"comp-{numbers}",
                anchor=anchor,
                members=members_sorted,
                shared_tags=frozenset(shared or set()),
                date_span_days=span,
            )
        )
    return clusters


def find_near_misses(
    specs: list[SpecRecord],
    *,
    composite_window_days: int,
    near_miss_max_days: int,
    already_clustered: set[str],
) -> list[NearMiss]:
    shipped = [
        s for s in specs
        if s.front_matter is not None and _spec_key(s) not in already_clustered
    ]
    shipped.sort(key=lambda s: (s.front_matter.date, s.number))  # type: ignore[union-attr]
    near: list[NearMiss] = []
    for i, left in enumerate(shipped):
        for right in shipped[i + 1 :]:
            assert left.front_matter is not None and right.front_matter is not None
            delta = abs((right.front_matter.date - left.front_matter.date).days)
            if delta <= composite_window_days:
                continue
            if delta > near_miss_max_days:
                continue
            shared = left.front_matter.tags & right.front_matter.tags
            if not shared:
                continue
            ordered = (left, right) if left.number <= right.number else (right, left)
            near.append(
                NearMiss(
                    left=ordered[0],
                    right=ordered[1],
                    delta_days=delta,
                    shared_tags=shared,
                )
            )
    return near


def stitch_composite_post(cluster: CompositeCluster) -> GeneratedPost:
    anchor = cluster.anchor
    shipped_members = [m for m in cluster.members if m.front_matter is not None]
    earliest_date = min(m.front_matter.date for m in shipped_members)  # type: ignore[union-attr]
    theme = _derive_composite_theme(cluster)
    title = _building_title(theme)

    body_lines: list[str] = []
    body_lines.append(f"## What We're Building\n\n{theme}")
    body_lines.append("")
    body_lines.append(
        "## How It Fits\n\nThis composite post groups specs that shipped within "
        f"{cluster.date_span_days} days of each other and share the tag(s): "
        f"{', '.join(sorted(cluster.shared_tags)) or '(none)'}."
    )
    body_lines.append("")
    body_lines.append("## Key Decisions\n")
    body_lines.append("## Members\n")
    for m in cluster.members:
        link = f"[{m.number:03d}-{m.slug}]({_relative_spec_path(m)})"
        ship = (
            m.front_matter.date.isoformat()
            if m.front_matter is not None
            else "(not shipped)"
        )
        body_lines.append(f"- {link} — {ship}")
    body_lines.append("")
    body_lines.append("## What Shipped\n")
    for m in cluster.members:
        if m.shipped_post_path is None:
            continue
        member_body = extract_shipped_body(m.shipped_post_path)
        first = _first_paragraph(member_body)
        if first:
            body_lines.append(f"**{m.number:03d}-{m.slug}** — {first}\n")
        refs, _malformed = harvest_image_refs(member_body, m)
        if refs:
            body_lines.append("#### Screenshots\n")
            for ref in refs:
                body_lines.append(f"![{ref.alt}]({ref.rewritten_path})")
            body_lines.append("")
    body_lines.append("## Lessons Learned\n")
    body_lines.append(
        "_Composite narrative — author may want to edit manually before publishing._"
    )
    body_lines.append("")
    body_lines.append("## What's Next\n")
    body_lines.append(
        "See each member spec's own follow-up notes; the composite is a snapshot."
    )

    fm = _format_front_matter(
        title=title,
        date=earliest_date,
        tags=cluster.shared_tags,
        fm=None,
    )
    body = f"{fm}\n\n" + "\n".join(body_lines).rstrip() + "\n"
    destination = anchor.path / "media" / "composite-post.md"
    return GeneratedPost(
        kind="composite",
        destination=destination,
        body=body,
        title=title,
        date=earliest_date,
        member_spec_numbers=tuple(m.number for m in cluster.members),
        opener_source="charter-framing",
    )


def _derive_composite_theme(cluster: CompositeCluster) -> str:
    if cluster.shared_tags:
        sorted_tags = sorted(cluster.shared_tags)
        if len(sorted_tags) == 1:
            return _title_case(sorted_tags[0])
        return " + ".join(_title_case(t) for t in sorted_tags[:3])
    return f"Composite: {', '.join(f'{m.number:03d}-{m.slug}' for m in cluster.members)}"


def _title_case(tag: str) -> str:
    return " ".join(word.capitalize() for word in tag.split("-"))


# ---------------------------------------------------------------------------
# Classifier + generation orchestration (wires US1/US2/US3/US4 together)
# ---------------------------------------------------------------------------


def classify_and_generate(
    *,
    specs: list[SpecRecord],
    epics: list[Epic],
    args: CliArgs,
    logger: logging.Logger,
    run_log: list[str] | None = None,
) -> tuple[
    list[Classification],
    list[GeneratedPost],
    list[UnresolvedGrouping],
    list[NearMiss],
]:
    run_log = run_log if run_log is not None else []
    specs_by_number: dict[int, list[SpecRecord]] = {}
    for s in specs:
        specs_by_number.setdefault(s.number, []).append(s)
    prefix_groups = scan_ex_prefixes(specs)
    unresolved: list[UnresolvedGrouping] = []
    unresolved.extend(detect_charter_prefix_mismatches(
        epics=epics, prefix_groups=prefix_groups, specs=specs,
    ))

    epic_member_keys: dict[str, str] = {}
    epic_posts: list[GeneratedPost] = []
    for epic in epics:
        if epic.status != "complete":
            continue
        members = _epic_members(epic, specs_by_number)
        if not members:
            continue
        post = stitch_epic_rollup(epic=epic, members=members)
        if post is None:
            continue
        epic_posts.append(post)
        for m in members:
            epic_member_keys[_spec_key(m)] = epic.id

    # Composite detection runs on specs that are shipped AND not epic members.
    non_epic_shipped = [
        s for s in specs
        if s.front_matter is not None and _spec_key(s) not in epic_member_keys
    ]
    pairs = find_composite_pairs(
        non_epic_shipped, window_days=args.composite_window_days,
    )
    clusters = cluster_composites(pairs)
    clustered: set[str] = set()
    composite_posts: list[GeneratedPost] = []
    composite_by_member: dict[str, str] = {}
    for cluster in clusters:
        if len(cluster.members) > 5:
            logger.warning(
                "composite cluster %s has %d members — consider tightening tags",
                cluster.id, len(cluster.members),
            )
        composite_posts.append(stitch_composite_post(cluster))
        for m in cluster.members:
            clustered.add(_spec_key(m))
            composite_by_member[_spec_key(m)] = cluster.id

    near_misses = find_near_misses(
        non_epic_shipped,
        composite_window_days=args.composite_window_days,
        near_miss_max_days=args.near_miss_max_days,
        already_clustered=clustered,
    )
    for nm in near_misses:
        unresolved.append(
            UnresolvedGrouping(
                kind="near-miss",
                summary=(
                    f"{nm.left.number:03d}-{nm.left.slug} ↔ "
                    f"{nm.right.number:03d}-{nm.right.slug} (Δ={nm.delta_days}d)"
                ),
                details=(
                    f"- Δdays: {nm.delta_days}\n"
                    f"- Shared tags: {', '.join(sorted(nm.shared_tags))}"
                ),
                cited_paths=(nm.left.path, nm.right.path),
            )
        )

    # Future-date guard
    today = _dt.date.today()
    for s in specs:
        if s.front_matter is not None and s.front_matter.date > today:
            unresolved.append(
                UnresolvedGrouping(
                    kind="future-date",
                    summary=f"{s.number:03d}-{s.slug} has future-dated shipped post ({s.front_matter.date})",
                    details=f"- Source: {s.shipped_post_path}",
                    cited_paths=(s.shipped_post_path,) if s.shipped_post_path else (),
                )
            )

    # Build classifications + unified posts.
    unified_posts: list[GeneratedPost] = []
    classifications: list[Classification] = []
    for spec in specs:
        key = _spec_key(spec)
        if key in epic_member_keys:
            epic_id = epic_member_keys[key]
            ship_date, date_source = resolve_ship_date(
                spec, repo_root=args.repo_root, skip_gh=args.skip_gh, logger=logger,
            )
            _, pr_source = get_pr_body(spec, skip_gh=args.skip_gh, logger=logger) if spec.has_shipped_post else ("", "missing")
            classifications.append(
                Classification(
                    spec=spec,
                    category="epic-member",
                    reason=f"member of {epic_id}",
                    epic_id=epic_id,
                    composite_id=None,
                    opener_source="charter-framing",
                    pr_body_source=pr_source,
                    date_source=date_source,
                )
            )
            run_log.append(f"classify {spec.number:03d}-{spec.slug} -> epic-member ({epic_id})")
            continue
        if key in composite_by_member:
            cluster_id = composite_by_member[key]
            ship_date, date_source = resolve_ship_date(
                spec, repo_root=args.repo_root, skip_gh=args.skip_gh, logger=logger,
            )
            _, pr_source = get_pr_body(spec, skip_gh=args.skip_gh, logger=logger) if spec.has_shipped_post else ("", "missing")
            classifications.append(
                Classification(
                    spec=spec,
                    category="composite-member",
                    reason=f"clustered as {cluster_id}",
                    epic_id=None,
                    composite_id=cluster_id,
                    opener_source="charter-framing",
                    pr_body_source=pr_source,
                    date_source=date_source,
                )
            )
            run_log.append(f"classify {spec.number:03d}-{spec.slug} -> composite-member ({cluster_id})")
            continue
        if not spec.has_shipped_post:
            classifications.append(
                Classification(
                    spec=spec,
                    category="skipped",
                    reason="no media/shipped-post.md (in-flight)",
                    epic_id=None,
                    composite_id=None,
                    opener_source=None,
                    pr_body_source=None,
                    date_source=None,
                )
            )
            run_log.append(f"classify {spec.number:03d}-{spec.slug} -> skipped")
            continue
        if spec.front_matter is None:
            unresolved.append(
                UnresolvedGrouping(
                    kind="malformed-yaml",
                    summary=f"{spec.number:03d}-{spec.slug} shipped-post has malformed YAML front matter",
                    details=f"- Source: {spec.shipped_post_path}",
                    cited_paths=(spec.shipped_post_path,) if spec.shipped_post_path else (),
                )
            )
            classifications.append(
                Classification(
                    spec=spec,
                    category="skipped",
                    reason="malformed shipped-post front matter — see UnresolvedGrouping",
                    epic_id=None,
                    composite_id=None,
                    opener_source=None,
                    pr_body_source=None,
                    date_source=None,
                )
            )
            run_log.append(f"classify {spec.number:03d}-{spec.slug} -> skipped (malformed)")
            continue

        ship_date, date_source = resolve_ship_date(
            spec, repo_root=args.repo_root, skip_gh=args.skip_gh, logger=logger,
        )
        if ship_date is None:
            ship_date = spec.front_matter.date  # guaranteed non-None at this branch
            date_source = "front-matter"
        opener, opener_source = load_or_synthesise_opener(spec)
        _, pr_source = get_pr_body(spec, skip_gh=args.skip_gh, logger=logger)
        try:
            post = stitch_unified_post(
                spec=spec,
                opener=opener,
                opener_source=opener_source,
                ship_date=ship_date,
            )
        except ValueError as exc:
            logger.error("stitch failed for %s: %s", spec.slug, exc)
            if args.fail_fast:
                raise
            classifications.append(
                Classification(
                    spec=spec,
                    category="skipped",
                    reason=f"stitch error: {exc}",
                    epic_id=None,
                    composite_id=None,
                    opener_source=None,
                    pr_body_source=None,
                    date_source=None,
                )
            )
            continue
        unified_posts.append(post)
        classifications.append(
            Classification(
                spec=spec,
                category="unified",
                reason="standalone shipped spec",
                epic_id=None,
                composite_id=None,
                opener_source=opener_source,
                pr_body_source=pr_source,
                date_source=date_source,
            )
        )
        run_log.append(
            f"classify {spec.number:03d}-{spec.slug} -> unified "
            f"(opener={opener_source}, pr_body={pr_source}, date={date_source})"
        )

    all_posts: list[GeneratedPost] = unified_posts + epic_posts + composite_posts
    return classifications, all_posts, unresolved, near_misses


def _spec_key(spec: SpecRecord) -> str:
    return f"{spec.number:03d}-{spec.slug}"


def assert_coverage_invariant(
    *,
    specs: list[SpecRecord],
    classifications: list[Classification],
    logger: logging.Logger,
) -> None:
    seen: dict[str, Classification] = {}
    for c in classifications:
        key = _spec_key(c.spec)
        if key in seen:
            raise AssertionError(
                f"spec {key} classified twice: "
                f"{seen[key].category} + {c.category}"
            )
        seen[key] = c
    missing = [s for s in specs if _spec_key(s) not in seen]
    if missing:
        raise AssertionError(
            "specs missing from classification: "
            + ", ".join(_spec_key(s) for s in missing[:5])
        )
    logger.debug(
        "coverage invariant: OK (%d specs, %d classifications)",
        len(specs), len(classifications),
    )


# ---------------------------------------------------------------------------
# Index serialiser (T092) + summary (T103)
# ---------------------------------------------------------------------------


def serialise_archive_index(index: ArchiveIndex, *, args: CliArgs) -> str:
    lines: list[str] = []
    lines.append("# Archive Rebuild")
    lines.append("")
    lines.append(
        "Generated by `scripts/regenerate-blog-archive.py` "
        "(spec 228; deleted in the same PR as this index)."
    )
    lines.append("")
    lines.append("## Run Metadata")
    lines.append("")
    lines.append(f"- **Started**: {_iso(index.run_started_at)}")
    if index.run_completed_at is not None:
        lines.append(f"- **Completed**: {_iso(index.run_completed_at)}")
    for key, value in sorted(index.run_tool_versions.items()):
        lines.append(f"- **{key}**: `{value}`")
    lines.append(f"- **Flags**: dry_run={args.dry_run}, skip_gh={args.skip_gh}, "
                 f"composite_window={args.composite_window_days}d, "
                 f"near_miss_max={args.near_miss_max_days}d")
    lines.append("")

    lines.append("## Index")
    lines.append("")
    lines.append("| Spec | Category | Title | Date | Generated Path | Opener | PR Body Source | Notes |")
    lines.append("|------|----------|-------|------|----------------|--------|----------------|-------|")
    post_by_spec: dict[int, GeneratedPost] = {}
    # For epic rollups / composites, associate with the anchor spec.
    for post in index.generated_posts:
        if post.kind == "unified":
            post_by_spec[post.member_spec_numbers[0]] = post
        else:
            # file lands at lowest-NNN anchor
            anchor_num = min(post.member_spec_numbers)
            post_by_spec.setdefault(anchor_num, post)
    for c in index.classifications:
        if c.category == "skipped":
            continue
        post = _find_post_for_classification(c, index.generated_posts)
        if post is None:
            continue
        rel_path = _relpath(post.destination, args.repo_root)
        notes = c.reason
        lines.append(
            f"| {c.spec.number:03d}-{c.spec.slug} | {c.category} | {post.title} | "
            f"{post.date.isoformat()} | `{rel_path}` | {c.opener_source or '-'} | "
            f"{c.pr_body_source or '-'} | {notes} |"
        )
    lines.append("")

    if index.skipped_specs:
        lines.append("## Skipped Specs")
        lines.append("")
        lines.append("| Spec | Reason |")
        lines.append("|------|--------|")
        by_key: dict[str, Classification] = {
            _spec_key(c.spec): c
            for c in index.classifications
            if c.category == "skipped"
        }
        for spec in sorted(index.skipped_specs, key=lambda s: (s.number, s.slug)):
            entry = by_key.get(_spec_key(spec))
            reason = entry.reason if entry is not None else "(no reason)"
            lines.append(f"| {spec.number:03d}-{spec.slug} | {reason} |")
        lines.append("")

    lines.append("## Unresolved Groupings")
    lines.append("")
    if not index.unresolved:
        lines.append("_None — every spec was confidently classified._")
        lines.append("")
    else:
        by_kind: dict[str, list[UnresolvedGrouping]] = {}
        for u in index.unresolved:
            by_kind.setdefault(u.kind, []).append(u)
        for kind in sorted(by_kind):
            lines.append(f"### {kind}")
            lines.append("")
            for u in by_kind[kind]:
                lines.append(f"- **{u.summary}**")
                for detail_line in u.details.splitlines():
                    lines.append(f"  {detail_line}")
                lines.append("")

    lines.append("## Runbook")
    lines.append("")
    lines.append(
        "Hand this index to the `debrief.github.io` maintainer. They execute "
        "the four steps below without needing follow-up questions."
    )
    lines.append("")
    lines.append(RUNBOOK_STEPS_MD)
    lines.append("")

    if index.run_log_lines:
        lines.append("<details>")
        lines.append("<summary>Run log (raw)</summary>")
        lines.append("")
        lines.append("```")
        for log_line in index.run_log_lines:
            lines.append(log_line)
        lines.append("```")
        lines.append("")
        lines.append("</details>")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def _find_post_for_classification(
    c: Classification,
    posts: list[GeneratedPost],
) -> GeneratedPost | None:
    if c.category == "unified":
        for post in posts:
            if post.kind == "unified" and c.spec.number in post.member_spec_numbers:
                return post
    if c.category == "epic-member":
        for post in posts:
            if post.kind == "epic-rollup" and c.spec.number in post.member_spec_numbers:
                return post
    if c.category == "composite-member":
        for post in posts:
            if post.kind == "composite" and c.spec.number in post.member_spec_numbers:
                return post
    return None


def _relpath(path: Path, root: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return str(path)


def _iso(moment: _dt.datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def render_summary(index: ArchiveIndex, *, args: CliArgs, elapsed: float) -> str:
    prefix = "[DRY-RUN] " if args.dry_run else ""
    gh_status = index.run_tool_versions.get("gh", "absent")
    classifications_by_cat: dict[str, int] = {}
    for c in index.classifications:
        classifications_by_cat[c.category] = classifications_by_cat.get(c.category, 0) + 1
    unified = classifications_by_cat.get("unified", 0)
    epic_members = classifications_by_cat.get("epic-member", 0)
    composite_members = classifications_by_cat.get("composite-member", 0)
    skipped = classifications_by_cat.get("skipped", 0)
    epic_posts = [p for p in index.generated_posts if p.kind == "epic-rollup"]
    composite_posts = [p for p in index.generated_posts if p.kind == "composite"]
    epic_ids = ", ".join(
        sorted(
            {c.epic_id for c in index.classifications if c.epic_id is not None}
        )
    ) or "-"
    scanned = len(index.classifications)
    eligible = scanned - skipped
    index_line = (
        f"Index would-be written at: {args.out_index}"
        if args.dry_run
        else f"Index written: {args.out_index}"
    )
    ts = _iso(index.run_completed_at or index.run_started_at)
    return (
        f"{prefix}Archive Rebuild Summary — {ts}\n"
        f"  Scanned:              {scanned} spec directories\n"
        f"  Shipped (eligible):   {eligible}\n"
        f"  Unified posts:        {unified}\n"
        f"  Epic rollups:         {len(epic_posts)}  ({epic_ids})\n"
        f"  Composite posts:      {len(composite_posts)}  "
        f"({composite_members} member specs)\n"
        f"  Epic members:         {epic_members}\n"
        f"  Skipped (in-flight):  {skipped}\n"
        f"  Unresolved groupings: {len(index.unresolved)}\n"
        f"  Run duration:         {elapsed:.1f}s\n"
        f"  GitHub API:           {gh_status}\n"
        f"{index_line}"
    )


# ---------------------------------------------------------------------------
# Argparse surface (T011)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CliArgs:
    dry_run: bool
    verbose: bool
    out_index: Path
    composite_window_days: int
    near_miss_max_days: int
    skip_gh: bool
    fail_fast: bool
    repo_root: Path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="regenerate-blog-archive",
        description="One-shot blog-archive regenerator (spec 228).",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--out-index", type=Path, default=None)
    parser.add_argument(
        "--composite-window-days",
        type=int,
        default=DEFAULT_COMPOSITE_WINDOW_DAYS,
    )
    parser.add_argument(
        "--near-miss-max-days",
        type=int,
        default=DEFAULT_NEAR_MISS_MAX_DAYS,
    )
    parser.add_argument("--skip-gh", action="store_true")
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument("--repo-root", type=Path, default=None)
    return parser


def parse_cli_args(argv: list[str]) -> CliArgs:
    parser = build_parser()
    ns = parser.parse_args(argv)
    repo_root = (ns.repo_root or _detect_repo_root()).resolve()
    out_index = (ns.out_index or (repo_root / "ARCHIVE-REBUILD.md")).resolve()

    if ns.composite_window_days < 1:
        parser.error("--composite-window-days must be ≥ 1")
    if ns.near_miss_max_days < ns.composite_window_days:
        parser.error("--near-miss-max-days must be ≥ --composite-window-days")
    if out_index.exists() and out_index.name != "ARCHIVE-REBUILD.md":
        parser.error(
            f"--out-index refuses to overwrite existing non-index file: {out_index}"
        )

    return CliArgs(
        dry_run=ns.dry_run,
        verbose=ns.verbose,
        out_index=out_index,
        composite_window_days=ns.composite_window_days,
        near_miss_max_days=ns.near_miss_max_days,
        skip_gh=ns.skip_gh,
        fail_fast=ns.fail_fast,
        repo_root=repo_root,
    )


def _detect_repo_root() -> Path:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Path.cwd()
    return Path(result.stdout.strip() or str(Path.cwd()))


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------


def build_logger(*, verbose: bool) -> logging.Logger:
    logger = logging.getLogger("regenerate_blog_archive")
    logger.handlers.clear()
    handler = logging.StreamHandler(stream=sys.stderr)
    handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.propagate = False
    return logger


def _gh_version() -> str:
    if shutil.which("gh") is None:
        return "absent"
    try:
        result = subprocess.run(
            ["gh", "--version"], capture_output=True, text=True,
            timeout=GH_TIMEOUT_SECONDS, check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        return "absent"
    if result.returncode != 0:
        return "absent"
    first_line = (result.stdout or "").splitlines()[:1]
    return first_line[0] if first_line else "unknown"


def _python_version() -> str:
    v = sys.version_info
    return f"{v.major}.{v.minor}.{v.micro}"


# ---------------------------------------------------------------------------
# Orchestrator (T035)
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    start = time.monotonic()
    args = parse_cli_args(list(argv or sys.argv[1:]))
    logger = build_logger(verbose=args.verbose)
    logger.info(
        "regenerate: repo=%s dry_run=%s skip_gh=%s",
        args.repo_root, args.dry_run, args.skip_gh,
    )

    try:
        specs = discover_specs(args.repo_root, logger=logger)
    except FileNotFoundError as exc:
        logger.error("%s", exc)
        return 1
    logger.info("discovered %d spec directories", len(specs))

    try:
        epics = parse_backlog_epics(args.repo_root / "BACKLOG.md")
    except OSError as exc:
        logger.warning("BACKLOG.md unreadable: %s", exc)
        epics = []
    logger.info("parsed %d epics from BACKLOG.md", len(epics))

    index = ArchiveIndex(
        run_tool_versions={
            "python": _python_version(),
            "gh": _gh_version(),
        }
    )

    try:
        with AtomicWriter(dry_run=args.dry_run, logger=logger) as writer:
            classifications, posts, unresolved, near_misses = classify_and_generate(
                specs=specs,
                epics=epics,
                args=args,
                logger=logger,
                run_log=index.run_log_lines,
            )
            index.classifications = classifications
            index.generated_posts = posts
            index.unresolved = unresolved
            index.near_misses = near_misses
            index.skipped_specs = [
                c.spec for c in classifications if c.category == "skipped"
            ]
            for post in posts:
                writer.stage(post.destination, post.body)

            assert_coverage_invariant(
                specs=specs, classifications=classifications, logger=logger,
            )

            index.run_completed_at = _dt.datetime.now(tz=_dt.UTC)
            writer.stage_overwrite(args.out_index, serialise_archive_index(index, args=args))
    except NoOverwriteError as exc:
        logger.error("no-overwrite guard tripped: %s", exc)
        return 1
    except AssertionError as exc:
        logger.error("coverage invariant violated: %s", exc)
        return 1
    except Exception as exc:  # noqa: BLE001
        logger.exception("run failed: %s", exc)
        return 1

    print(render_summary(index, args=args, elapsed=time.monotonic() - start))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
