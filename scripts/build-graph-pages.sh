#!/usr/bin/env bash
# Build the browsable graphify pages published to gh-pages under code-graph/.
# See ADR-041 and docs/graphify-developer-guide.md.
#
# Three kinds of page:
#   index.html          landing page linking everything
#   tree.html           whole-repo D3 collapsible tree (all ~14,300 nodes)
#   adr/                interactive ADR citation graph (~174 nodes)
#   packages/<slug>/    per-package force-directed drill-downs
#
# Graphify refuses force-directed rendering above 5,000 nodes, so the whole-repo
# graph can only ever be the tree. The drill-downs are scoped to the packages big
# enough to be worth exploring; everything else is legible straight from the tree.
#
# Usage: bash scripts/build-graph-pages.sh
# Prerequisite: graphify-out/graph.json and adr-graph.json exist (task graph:build).

set -euo pipefail

GRAPHIFY="uvx --from graphifyy==0.9.35 graphify"
OUT="graphify-out/pages"

# Packages large enough to justify their own interactive page. Node counts at the
# time of writing, against graphify's 5,000-node viz limit:
#   shared/components 3154 · apps/vscode 1784 · services/calc 1701
#   services/io 1208 · apps/web-shell 863
# The remaining ~18 workspace packages are all under 600 nodes and read fine from
# the tree. Add a package here if it grows past roughly 800 nodes.
PACKAGES=(
  "shared/components"
  "apps/vscode"
  "services/calc"
  "services/io"
  "apps/web-shell"
)

test -f graphify-out/graph.json || {
  echo "error: graphify-out/graph.json missing — run 'task graph:build' first." >&2
  exit 1
}

rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> whole-repo tree"
$GRAPHIFY tree \
  --output "$OUT/tree.html" \
  --root . \
  --label "Debrief — whole repository" >/dev/null

echo "==> ADR citation graph"
mkdir -p "$OUT/adr"
cp graphify-out/adr-graph.json "$OUT/adr/graph.json"
$GRAPHIFY cluster-only "$OUT/adr" --graph "$OUT/adr/graph.json" --no-label >/dev/null
mv "$OUT/adr/graphify-out/graph.html" "$OUT/adr/index.html"
rm -rf "$OUT/adr/graphify-out" "$OUT/adr/graph.json"

# Collected while building, so the landing page reports real numbers rather than
# figures that rot the first time a package grows.
rows=""
for pkg in "${PACKAGES[@]}"; do
  slug="${pkg//\//-}"
  echo "==> package: $pkg"
  dir="$OUT/packages/$slug"
  mkdir -p "$dir"
  $GRAPHIFY extract "$pkg" --code-only --no-cluster --out "$dir" >/dev/null 2>&1
  nodes=$(python3 -c "import json,sys;print(len(json.load(open(sys.argv[1]))['nodes']))" \
    "$dir/graphify-out/graph.json")
  $GRAPHIFY cluster-only "$dir" --graph "$dir/graphify-out/graph.json" --no-label >/dev/null
  mv "$dir/graphify-out/graph.html" "$dir/index.html"
  rm -rf "$dir/graphify-out"
  rows="${rows}    <li><a href=\"packages/${slug}/\"><code>${pkg}</code></a> <span>${nodes} nodes</span></li>"$'\n'
done

cp graphify-out/GRAPH_REPORT.md "$OUT/GRAPH_REPORT.md"

built_from=$(grep -oE 'Built from commit: `[0-9a-f]+`' graphify-out/GRAPH_REPORT.md \
  | grep -oE '[0-9a-f]{6,}' || echo "unknown")

cat > "$OUT/index.html" <<HTML
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Debrief — code graph</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff; --fg: #1a1a1a; --muted: #666; --line: #e2e2e2; --accent: #0b6bcb;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #16191d; --fg: #e6e6e6; --muted: #9aa0a6; --line: #2c3137; --accent: #6cb2ff; }
  }
  body { background: var(--bg); color: var(--fg); margin: 0 auto; padding: 2.5rem 1.25rem 4rem;
         max-width: 46rem; font: 16px/1.6 system-ui, -apple-system, sans-serif; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.05rem; margin: 2rem 0 .5rem; }
  p.sub { color: var(--muted); margin: 0 0 2rem; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { display: flex; justify-content: space-between; gap: 1rem; align-items: baseline;
       padding: .55rem 0; border-bottom: 1px solid var(--line); }
  li span { color: var(--muted); font-size: .85rem; white-space: nowrap; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; }
  footer { margin-top: 2.5rem; color: var(--muted); font-size: .85rem; }
</style>
<h1>Debrief — code graph</h1>
<p class="sub">Developer tooling. An index for exploration, never a record — see
<a href="https://github.com/debrief/debrief-future/blob/main/docs/graphify-developer-guide.md">the guide</a>.</p>

<h2>Whole repository</h2>
<ul>
  <li><a href="tree.html">Collapsible tree</a> <span>all ~14,300 nodes</span></li>
  <li><a href="GRAPH_REPORT.md">Graph report</a> <span>hubs &amp; communities</span></li>
</ul>

<h2>Decisions</h2>
<ul>
  <li><a href="adr/">ADR citation graph</a> <span>39 ADRs, 510 citations</span></li>
</ul>

<h2>Packages</h2>
<ul>
${rows}</ul>

<footer>
  Built from commit <code>${built_from}</code>.
  Force-directed views are capped at 5,000 nodes, so the whole repository is only
  available as the tree; packages under ~600 nodes read fine there and have no
  page of their own.
</footer>
HTML

echo "==> done"
du -sh "$OUT"
