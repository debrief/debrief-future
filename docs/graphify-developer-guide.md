# Graphify — developer guide

A queryable knowledge graph over the Debrief source tree and its ADR citation
network. **Developer tooling only** — it is not analyst-facing, not product code,
and nothing shipped depends on it. See ADR-041 for the decision record.

## What problem it solves

The existing gates — `knip` (dead exports), the custom rules in
`shared/eslint-rules/`, `pyright`, `tsc`, `check-adr-refs.sh` — answer *closed*
questions well: they encode rules we already know and fail the build.

The graph is for the **open-ended** question, asked before you know what rule you
would want:

| Question | How |
|---|---|
| What consumes this shared export? | `graphify affected "<symbol>"` |
| What breaks if I change this? | `graphify affected "<symbol>" --depth 3` |
| Everything that cites ADR-030? | `graphify affected "ADR-030" --relation cites` |
| What does this ADR touch? | `graphify explain "ADR-033"` |
| Shortest link between two things? | `graphify path "A" "B"` |
| Where are the architectural hubs? | `graphify god-nodes --top 20` |

The clearest payoff is the last row feeding the first list: `shared/eslint-rules/`
has grown whenever somebody happened to notice a coupling worth policing. Hub and
community analysis makes that deliberate. **The graph feeds the gates; it does not
replace them.**

## Setup

Nothing to install. Every entry point runs through `uvx --from graphifyy==0.9.35`,
which resolves and caches on first use.

```sh
task graph:build      # full deterministic build (~45s) + ADR citation merge
task graph:refresh    # incremental re-extract after code changes
task graph:report     # regenerate GRAPH_REPORT.md (hubs, communities)
task graph:pages      # build the browsable pages
```

Output lands in `graphify-out/`, which **is committed** — so a fresh clone can query
the graph immediately without building anything. Claude Code picks it up through the
`graphify` MCP server registered in `.mcp.json`.

Rebuild and commit when you have changed enough source for the graph to matter.
`graph:build` regenerates `graph.json` (~15MB) so expect a large diff; that weight is
the accepted cost of the graph being available on clone (ADR-041). The SHA256 cache
and incremental manifest stay ignored as machine state.

**Order matters.** `graphify cluster-only` rewrites `graph.json` with its own
serialiser, re-inflating it and collapsing same-endpoint edges — the ADR citation
edges drop by roughly half, losing per-line multiplicity. The ADR merge therefore runs last in
every task. If you invoke graphify directly, finish with
`python scripts/extract-adr-graph.py --merge`.

> **Install the right package.** The PyPI name is `graphifyy`, with a double *y*.
> `pip install graphify` is a different, unrelated package. See `key_facts.md`.

## What is in the graph

- **Code** — `services/`, `shared/`, `apps/`: ~14,300 nodes and ~30,000 edges from
  tree-sitter AST across TypeScript, Python and shell.
- **ADR citations** — 39 ADR nodes and 510 `cites` edges, extracted by
  `scripts/extract-adr-graph.py` and merged in place.

Scope is controlled by `.graphifyignore`.

## What is *not* in the graph

Read this section before trusting an answer.

- **The LinkML chain.** `shared/schemas` LinkML → generated Pydantic/TS →
  consumers crosses a code generator, which no AST parser can see. The graph shows
  who imports the *generated* types but can never link them back to the schema that
  produced them. This is exactly the chain Article II and ADR-033 care most about,
  so do not read coverage into it.
- **`specs/`.** 2,851 files, ~2.6M words, deliberately excluded: those features
  shipped and their value was banked. Revisit as a separate graph if archaeology
  ever justifies it.
- **Prose concepts.** We run code-only extraction. Graphify *can* mine concepts from
  markdown and PDFs, but only via an LLM, and upstream has no headless path for it
  ([#698](https://github.com/Graphify-Labs/graphify/issues/698)). The ADR citation
  layer is our deterministic substitute for the part that actually mattered.
- **Legacy Debrief Java.** Not in this repository.
- **Generated code, fixtures, vendored bundles, `*.json`.** Excluded as noise — see
  `.graphifyignore` for the reasoning on each.

## Trust and limits

**The graph is an index, never a record.** Even in code-only mode, extraction is
97% `EXTRACTED` / 3% `INFERRED` — roughly 1,035 edges come from fuzzy call
resolution. It is an exploration aid. It is not evidence, and it must never be
cited as provenance in an analysis or a decision.

**Determinism.** Code extraction makes zero LLM calls and needs no API key or
network. Two consecutive builds produce a byte-identical `graph.json`;
`GRAPH_REPORT.md` records `Token cost: 0 input · 0 output`. If you ever see a
non-zero token cost, something has enabled the semantic pass and the reproducibility
guarantee no longer holds.

**Staleness is the main hazard** — a stale graph answers confidently with
yesterday's architecture. `GRAPH_REPORT.md` records `Built from commit: <sha>`.
Compare it against the last commit that touched graphed source
(`git log -1 --format=%h -- services shared apps`), not against `HEAD` — a graph
can never carry the SHA of the commit that contains it, so it always trails `HEAD`
by one. Optionally install the post-commit hook:

```sh
uvx --from graphifyy==0.9.35 graphify hook install
```

**Community labels are placeholders** (`Community 0`, `Community 1`, …). Naming
them needs an LLM backend we deliberately do not configure. `god-nodes` is
unaffected and gives meaningful hub output.

## Browsable pages

`.github/workflows/graphify-publish.yml` deploys the **committed** pages on pushes to
`main` that touch them — a copy, not a rebuild, so what ships is what was reviewed. It
is a **publisher, not a gate**: it never runs on pull requests and cannot block a merge.
A second advisory job compares the graph's recorded build commit against the last
commit touching `services/`, `shared/` or `apps/`, and reports drift to the Actions
summary without failing anything.

Published under `https://debrief.github.io/debrief-future/code-graph/`:

| Page | Scope |
|---|---|
| `/` | Landing index |
| `/tree.html` | Whole repository, D3 collapsible tree (~14,300 nodes) |
| `/adr/` | Interactive ADR citation graph (39 ADRs, 510 citations) |
| `/packages/<slug>/` | Per-package force-directed drill-downs |
| `/GRAPH_REPORT.md` | Hubs and communities |

There is deliberately no repo-wide *force-directed* page: graphify refuses that
rendering above 5,000 nodes and our graph is roughly 14,300. The collapsible tree
handles the whole repo and suits a code hierarchy better anyway.

Force-directed drill-downs exist for the five packages big enough to be worth
exploring — `shared/components` (3,154 nodes), `apps/vscode` (1,784),
`services/calc` (1,701), `services/io` (1,208) and `apps/web-shell` (863). The
other ~18 workspace packages are all under 600 nodes and read fine from the tree.
The list lives in `PACKAGES` in `scripts/build-graph-pages.sh`; add a package once
it grows past roughly 800 nodes, and note the 5,000-node ceiling is per page —
splitting by workspace package rather than by top-level directory is what keeps
every page comfortably under it (`services/` as a whole is already at 4,744).

## Previewing from a pull request

The production publisher only fires on `main`, so a PR that changes the graph has
nothing to click through by default. Two ways to look at it:

**Deploy a branch preview.** Two routes, and which one works depends on whether
the workflow has reached `main` yet:

- *Normal case* — Actions → *Preview Code Graph (branch)* → **Run workflow** →
  pick the branch.
- *When the workflow itself is not yet on `main`* — push the branch to a
  `preview/`-prefixed name and the push trigger fires it:
  `git push origin <branch>:refs/heads/preview/<name>`. GitHub only exposes the
  **Run workflow** button for `workflow_dispatch` workflows that already exist on
  the default branch, so dispatch returns a 404 until the workflow merges. The
  push route works from any branch.

Either way it deploys to:

```
https://debrief.github.io/debrief-future/code-graph-preview/<slug>/
```

`<slug>` is the *deployed* branch name with non-`[A-Za-z0-9-]` characters replaced
by `-`, so a push to `preview/code-graph` publishes under `preview-code-graph`.
Previews share `gh-pages` with production under `keep_files: true`, so this never
overwrites `/code-graph/` or a sibling preview. Delete one by removing its folder
from `gh-pages` and deleting the `preview/` branch.

GitHub Pages takes a minute or two to serve a fresh deploy — a 404 immediately
after the workflow goes green is propagation, not a broken deploy.

**Or open the files directly.** The pages are committed, so a checkout is enough —
no server, no build:

```sh
git checkout <branch>
open graphify-out/pages/index.html      # macOS; xdg-open on Linux
```

The pages are **not self-contained** and are not intended to be: the tree loads
D3 from `d3js.org` and the force-directed views load vis-network from
`unpkg.com`, so they need network access to render. This is accepted —
maintenance and development tooling is expected to have internet access, and
Article III.4's offline-by-default guarantee is about the product, not about the
tools we build it with. Do not "fix" this by vendoring the libraries; it would
add weight for no benefit.

## The ADR citation graph

`scripts/extract-adr-graph.py` links every `ADR-NNN` token to its `### ADR-NNN:`
heading in `decisions.md`. It exists because two graphify behaviours make its own
extraction unusable for this: the generic `docref` extractor zero-pads IDs to four
digits so they never match our three-digit convention, and `--code-only` skips
markdown, where most citations live.

Edges anchor to graphify's recorded `source_file` values rather than to re-derived
node IDs, so they survive upstream changes to ID slugging. Merging is done in place
by our script and is idempotent — graphify's own `merge-graphs` is for cross-*repo*
merges and namespaces every node (`repo::…`), which would sever those anchors.

The companion guard `scripts/check-adr-refs.sh` runs in `task lint`. It validates
all 597 ADR citations repo-wide (it previously checked only LinkML YAML) and rejects
malformed non-three-digit IDs. `ADR-031` and `ADR-032` are allowlisted as
reserved-but-unwritten; remove them from `RESERVED` once their headings exist.
