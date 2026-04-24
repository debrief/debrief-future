# Fixtures for `tests/regenerate_blog_archive/`

These fixtures are curated copies or synthetic stand-ins of real spec
directories. They exist only for the lifetime of spec 228 — the entire test
package is deleted in the same PR that commits the regenerated archive
(FR-009 / tasks.md T121).

## Curation rules

- **Minimal shape**: each fixture contains only the files the relevant test
  actually reads (usually `spec.md`, `media/shipped-post.md`, and optionally
  `evidence/opening-context.md`).
- **Synthetic frontmatter**: dates, tags, and titles are hand-authored for
  test determinism, not copied from real specs. Real names are used only where
  the test cross-references something external (e.g. BACKLOG excerpt).
- **No real spec mutation**: tests NEVER point at the live `specs/*/` tree. If
  a test needs to exercise the full discover → classify → stage pipeline, it
  assembles a temporary fixtures-only spec tree under `tmp_path`.

## Layout

```text
fixtures/
├── README.md                     # this file
├── shipped-post-valid.md         # T017 — happy-path YAML front matter
├── shipped-post-malformed.md     # T018 — unquoted colon in title (C11)
├── backlog-excerpt.md            # T058 — BACKLOG Epics table with E02 + synthetic E99
└── specs/
    ├── with-opener/              # T041 — spec with evidence/opening-context.md
    ├── no-opener/                # T042 — forces synthesis fallback
    └── legacy-dated/             # T023 — legacy YYYY-MM-DD-shipped-*.md naming
```

Each child spec directory under `specs/` is a directory, not a symlink, so the
tests can walk them with the same code that walks the live `specs/` tree.
