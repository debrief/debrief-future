# Quickstart: Regenerate the Blog Archive

**Audience**: The developer running the archive regeneration (likely Ian) and the reviewer of the resulting PR.

**Prerequisite**: PR #511 (combine-articles-cache-specs) has merged to `main` and `evidence/opening-context.md` exists for the majority of recent shipped specs (NFR-003 dependency satisfied).

---

## TL;DR

```sh
# 1. Dry run to sanity-check classification and thresholds.
python scripts/regenerate-blog-archive.py --dry-run --verbose

# 2. Read the would-be ARCHIVE-REBUILD.md (printed to stdout) and scan the
#    "Unresolved Groupings" section. Fix any charter/prefix mismatches by
#    editing BACKLOG.md or the offending spec title BEFORE the real run.

# 3. Real run.
python scripts/regenerate-blog-archive.py

# 4. Review diffs.
git status              # should show additions only, plus ARCHIVE-REBUILD.md
git diff --stat         # quick sanity check on volume

# 5. Commit, open the PR. Delete the script and its tests as the final commit.
```

---

## 1. Set expectations before running

The generator runs against ~155 spec directories. It will produce:
- ~90–100 unified posts (one per standalone shipped spec)
- ~5–8 epic rollups (one per complete epic from `BACKLOG.md`)
- 0–5 composite posts (temporally + thematically clustered standalone specs)
- 1 `ARCHIVE-REBUILD.md` at repo root (the website-dev handoff)

Runtime: under 60 s. No existing file is modified.

---

## 2. Dry run first

```sh
python scripts/regenerate-blog-archive.py --dry-run --verbose
```

What to look for in the dry-run output (printed to stdout):

- **Summary block**: counts look right (most shipped specs classified as unified; small handful as epic-member; ≤5 composite-member).
- **Unresolved Groupings**: every entry has enough citation to act on.
  - *Charter/prefix mismatch*: check whether the spec's `[Ex]` prefix is wrong or whether `BACKLOG.md` is missing an item.
  - *Near-miss composites*: decide whether to promote each pair manually (edit the script's `--composite-window-days` or accept the pair as two separate unified posts).
  - *Legacy charters*: epics without a `docs/ideas/Exx-*.md` and no `[Ex]` members show up here — fix by either adding the doc or tagging members.
- **Skipped list**: recognise each skipped spec as intentionally in-flight. If something that HAS shipped appears here, the cause is a missing `media/shipped-post.md` — fix upstream first.

Nothing has been written to disk. Iterate as needed.

---

## 3. Threshold tuning (optional)

If the dry run produces zero composites:

```sh
python scripts/regenerate-blog-archive.py --dry-run \
    --composite-window-days 7 --near-miss-max-days 14
```

If it produces too many (every week's specs cluster — likely tag-noise issue):
- Inspect the "Shared tags" column for false positives.
- Either extend the noise list in the script (three-tag default filters out `tracer-bullet`, `shipped`, `debrief`) or accept the composites.

Document whatever threshold you settled on in the PR description so the reviewer understands why the defaults may differ from FR-003's 5-day / ≥1-tag binding.

---

## 4. Real run

```sh
python scripts/regenerate-blog-archive.py
```

Exit code 0 means success. `ARCHIVE-REBUILD.md` is at the repo root; new post files are under `specs/*/media/`. Nothing else in the repo has changed.

If you see exit code 1, read stderr — the offending spec is named and the temp directory has been cleaned up. Fix the root cause and re-run.

Exit code 3 is rare but important: mid-promotion failure. Run `git status`; some new files may be present and others not. Delete whatever the script wrote (new files only), investigate what went wrong, re-run.

---

## 5. Review the output yourself before opening the PR

Spot-check three specs:

1. **One unified**: open `specs/206-audit-non-linkml-types/media/unified-post.md`. First three sections match `specs/206-audit-non-linkml-types/evidence/opening-context.md` byte-for-byte. Remaining four sections read as a coherent "What We Built / By the Numbers / Lessons Learned / What's Next" narrative drawn from `shipped-post.md`.
2. **One epic rollup**: e.g. `specs/070-prov-schema-foundation/media/epic-rollup.md` (E02 anchor). Title is charter-derived (no `Building` prefix). Every E02 member is referenced in the body. No `unified-post.md` exists for any E02 member.
3. **One composite** (if any): `specs/NNN-<anchor>/media/composite-post.md`. Lists all members. Neither member has a `unified-post.md`.

If any of these fail, you have a bug — fix the script and re-run (the script is idempotent against clean state; delete the previous run's outputs first: `git clean -fd specs/*/media/{unified-post,epic-rollup,composite-post}.md && rm -f ARCHIVE-REBUILD.md`).

---

## 6. Open the PR

PR description template:

```markdown
## Regenerate Future Debrief blog archive (#228)

Runs `scripts/regenerate-blog-archive.py` (included in this PR, deleted in the
final commit) to emit unified / epic-rollup / composite posts across the
shipped portion of the archive, plus `ARCHIVE-REBUILD.md` at repo root for
the debrief.github.io maintainer.

### Summary counts
<paste the stdout summary block from the real run>

### Threshold tuning
<note any deviation from FR-003 defaults, or "Defaults unchanged">

### Verification
- [x] `ARCHIVE-REBUILD.md` has one row per generated post (SC-001).
- [x] Every `evidence/opening-context.md` appears verbatim as sections 1–3 of its unified post, spot-checked on 3 specs (SC-003).
- [x] `git diff --stat` shows additions only under `specs/*/` — no modifications (SC-004).
- [x] Unresolved Groupings has zero silent misclassifications (SC-005).
- [x] Generator source committed, reviewable, then deleted in final commit (NFR-004 + FR-009).
```

---

## 7. Final commit — delete the generator

```sh
git rm scripts/regenerate-blog-archive.py
git rm -r tests/regenerate_blog_archive/
git commit -m "chore(228): remove one-shot generator per FR-009"
git push
```

The PR now shows the script being added AND removed in the same PR — reviewers can inspect it in the intermediate commit.

---

## 8. Handoff

Once the PR merges, email/Slack the website maintainer with a link to the merged `ARCHIVE-REBUILD.md` on `main`. The runbook inside that file is self-contained — wipe `_posts/future/*`, copy the generated files, adjust front matter per the runbook, deploy. SC-002 is satisfied when the maintainer reports "done" without asking a follow-up question.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| "No `gh` found" warning flooding stderr | `gh` CLI not installed or not on PATH | Either install `gh` or pass `--skip-gh`. The run still succeeds; PR-body source will be `shipped-post` for every row. |
| A shipped spec is missing from the index | `media/shipped-post.md` is missing | Fix upstream by adding the shipped post, then re-run. |
| Composite posts cluster irrelevantly | Tag noise | Add more tags to the filter in the script's `NOISE_TAGS` constant; re-run with `--dry-run` to verify. |
| `ARCHIVE-REBUILD.md` already exists and you changed your mind about overwriting | The script overwrites its own index by design | No fix needed — intentional. If you want to preserve the previous run, save a copy first. |
| Exit code 3 (partial promotion) | Filesystem flake or permission issue mid-promotion | `git status` to see what landed, undo with `git clean -fd` + `git checkout`, investigate, re-run. |
