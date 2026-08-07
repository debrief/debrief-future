#!/usr/bin/env python3
"""Emit the ADR citation graph as a graphify-mergeable JSON graph.

Why this exists
---------------
ADRs are the densest knowledge structure in the repository: 38 decisions living
as ``### ADR-NNN:`` headings inside a single ~19k-word
``docs/project_notes/decisions.md``, cited ~590 times from markdown, TypeScript,
Python and LinkML YAML. That citation network is a genuine graph and it is
entirely deterministic — an ``ADR-NNN`` token linked to a matching heading.

Graphify's generic ``docref`` extractor does pick up ADR mentions in *code*
comments, but it normalises the IDs to a fixed four-digit width — zero-padding
our three-digit convention — so those nodes never join our real ADR identifiers,
and it skips markdown entirely in ``--code-only`` mode, which is where most
citations live. Rather than depend on graphify's semantic (LLM) pass for the
highest-value edges in the repo, we extract them ourselves: free, offline,
reproducible.

Edges are anchored to graphify's own ``source_file`` values rather than to
re-derived node IDs, so this keeps working if graphify changes its ID slugging.

Usage
-----
    python scripts/extract-adr-graph.py                  # write adr-graph.json
    python scripts/extract-adr-graph.py --stdout         # print to stdout
    python scripts/extract-adr-graph.py --graph G.json   # anchor to an existing graph

Merge into the main graph with ``--merge``. Note that graphify's own
``merge-graphs`` command is *not* usable here: it is built for combining
graphs from different repositories and namespaces every node ID (``repo::…``),
which severs the anchors this script works to establish.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DECISIONS_FILE = REPO_ROOT / "docs" / "project_notes" / "decisions.md"

# `### ADR-030: vite-plugin-pwa adoption for Backlog Navigator (#244, 2026-05-03)`
ADR_HEADING = re.compile(r"^###\s+(ADR-\d{3}):\s*(.+?)\s*$")
# A citation is any three-digit ADR token. Four-digit forms are typos caught by
# scripts/check-adr-refs.sh, not silently absorbed here.
ADR_CITATION = re.compile(r"\bADR-\d{3}\b")

SCANNED_SUFFIXES = frozenset(
    {".md", ".ts", ".tsx", ".js", ".cjs", ".mjs", ".py", ".yaml", ".yml", ".sh", ".json"}
)


def git_tracked_files() -> list[Path]:
    """Return repo-tracked files, so build artefacts and vendored code never leak in."""
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=True,
        text=True,
    )
    return [REPO_ROOT / p for p in result.stdout.split("\0") if p]


def parse_adr_definitions() -> dict[str, str]:
    """Map ADR ID -> its heading title, from decisions.md."""
    definitions: dict[str, str] = {}
    for line in DECISIONS_FILE.read_text(encoding="utf-8").splitlines():
        match = ADR_HEADING.match(line)
        if match:
            definitions[match.group(1)] = match.group(2)
    return definitions


def collect_citations(files: list[Path]) -> dict[str, list[tuple[str, int]]]:
    """Map ADR ID -> [(repo-relative path, 1-indexed line), ...].

    Heading lines in decisions.md are definitions rather than citations and are
    skipped; cross-references between ADRs in that file are still collected.
    """
    citations: dict[str, list[tuple[str, int]]] = {}
    for path in files:
        if path.suffix not in SCANNED_SUFFIXES or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if "ADR-" not in text:
            continue
        rel = path.relative_to(REPO_ROOT).as_posix()
        is_decisions = path == DECISIONS_FILE
        for lineno, line in enumerate(text.splitlines(), start=1):
            if is_decisions and ADR_HEADING.match(line):
                continue
            for adr_id in dict.fromkeys(ADR_CITATION.findall(line)):
                citations.setdefault(adr_id, []).append((rel, lineno))
    return citations


def load_source_file_index(graph_path: Path | None) -> dict[str, str]:
    """Map source_file -> graphify's file-level node ID, so our edges join its graph.

    Graphify only sets ``metadata.kind == "file"`` for some languages (bash); for
    TypeScript and Python the file-level node carries no ``kind`` at all. What
    holds across every language is the ID shape: symbol nodes extend the file's
    path slug with a suffix, so the file-level node is the shortest ID sharing a
    ``source_file``. Anchoring on that (rather than on ``kind``, or on
    re-deriving the slug ourselves) survives both gaps.
    """
    if graph_path is None or not graph_path.is_file():
        return {}
    data: dict[str, Any] = json.loads(graph_path.read_text(encoding="utf-8"))
    index: dict[str, str] = {}
    for node in data.get("nodes", []):
        source_file = node.get("source_file")
        node_id = node.get("id")
        if not isinstance(source_file, str) or not isinstance(node_id, str):
            continue
        # Skip anything a previous --merge contributed. Without this the run
        # after a merge anchors to our own synthetic file nodes instead of
        # graphify's, and the output oscillates between runs.
        if node.get("_origin") == "adr-extractor":
            continue
        current = index.get(source_file)
        if current is None or (len(node_id), node_id) < (len(current), current):
            index[source_file] = node_id
    return index


def file_node_id(rel_path: str) -> str:
    """Fallback ID for files graphify has no node for (markdown in --code-only runs)."""
    stem = re.sub(r"\.[^./]+$", "", rel_path)
    return "file_" + re.sub(r"[^a-z0-9]+", "_", stem.lower()).strip("_")


def build_graph(graph_path: Path | None) -> dict[str, Any]:
    definitions = parse_adr_definitions()
    citations = collect_citations(git_tracked_files())
    source_index = load_source_file_index(graph_path)

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    decisions_rel = DECISIONS_FILE.relative_to(REPO_ROOT).as_posix()

    for adr_id, title in sorted(definitions.items()):
        nodes.append(
            {
                "id": adr_id.lower().replace("-", "_"),
                "label": adr_id,
                "file_type": "doc",
                "source_file": decisions_rel,
                "source_location": title,
                "metadata": {"kind": "adr", "title": title},
                "_origin": "adr-extractor",
            }
        )

    anchored_ids = set(source_index.values())
    emitted_files: set[str] = set()
    for adr_id, sites in sorted(citations.items()):
        if adr_id not in definitions:
            # Reserved-but-unwritten IDs. check-adr-refs.sh owns that policy;
            # here we simply do not invent a node for a decision nobody wrote.
            continue
        target = adr_id.lower().replace("-", "_")
        for rel_path, lineno in sites:
            source_id = source_index.get(rel_path) or file_node_id(rel_path)
            if source_id not in anchored_ids and source_id not in emitted_files:
                emitted_files.add(source_id)
                nodes.append(
                    {
                        "id": source_id,
                        "label": Path(rel_path).name,
                        "file_type": "doc" if rel_path.endswith(".md") else "code",
                        "source_file": rel_path,
                        "source_location": "L1",
                        "metadata": {"kind": "file"},
                        "_origin": "adr-extractor",
                    }
                )
            edges.append(
                {
                    "source": source_id,
                    "target": target,
                    "relation": "cites",
                    "confidence": "EXTRACTED",
                    "source_file": rel_path,
                    "source_location": f"L{lineno}",
                    "weight": 1.0,
                    "_origin": "adr-extractor",
                }
            )

    return {"nodes": nodes, "edges": edges, "hyperedges": []}


def merge_into(graph_path: Path, addition: dict[str, Any]) -> tuple[int, int]:
    """Append ADR nodes and citation edges into an existing graph, in place.

    Handles both shapes graphify emits: ``extract`` writes ``nodes``/``edges``,
    while networkx node-link output uses ``nodes``/``links``. Node IDs are left
    untouched — that is the whole point, since the edges are anchored to them.
    Re-running is idempotent: anything this script previously contributed is
    identified by ``_origin`` and replaced rather than duplicated.
    """
    data: dict[str, Any] = json.loads(graph_path.read_text(encoding="utf-8"))
    edge_key = "links" if "links" in data else "edges"

    data["nodes"] = [n for n in data.get("nodes", []) if n.get("_origin") != "adr-extractor"]
    data[edge_key] = [e for e in data.get(edge_key, []) if e.get("_origin") != "adr-extractor"]

    existing_ids = {n["id"] for n in data["nodes"]}
    added_nodes = [n for n in addition["nodes"] if n["id"] not in existing_ids]
    data["nodes"].extend(added_nodes)
    data[edge_key].extend(addition["edges"])

    # Compact separators, not indent=2: graph.json is committed (ADR-041) and
    # pretty-printing it costs ~10MB of repository weight for a machine-read file.
    # sort_keys keeps the byte-for-byte reproducibility the ADR relies on.
    graph_path.write_text(
        json.dumps(data, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8"
    )
    return len(added_nodes), len(addition["edges"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--graph",
        type=Path,
        default=REPO_ROOT / "graphify-out" / "graph.json",
        help="existing graph.json to anchor edges to (default: graphify-out/graph.json)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "graphify-out" / "adr-graph.json",
        help="output path (default: graphify-out/adr-graph.json)",
    )
    parser.add_argument("--stdout", action="store_true", help="print to stdout instead of writing")
    parser.add_argument(
        "--merge",
        action="store_true",
        help="also merge the result into --graph in place (idempotent)",
    )
    args = parser.parse_args()

    graph = build_graph(args.graph)
    payload = json.dumps(graph, indent=2, sort_keys=True) + "\n"

    if args.stdout:
        sys.stdout.write(payload)
    else:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload, encoding="utf-8")
        adr_nodes = sum(1 for n in graph["nodes"] if n["metadata"]["kind"] == "adr")
        try:
            shown = args.out.relative_to(REPO_ROOT)
        except ValueError:
            shown = args.out
        print(
            f"wrote {shown} — {adr_nodes} ADR node(s), {len(graph['edges'])} citation edge(s)"
        )
        if args.merge:
            if not args.graph.is_file():
                print(f"error: --merge needs an existing graph at {args.graph}", file=sys.stderr)
                return 1
            merged_nodes, merged_edges = merge_into(args.graph, graph)
            print(f"merged into {args.graph.name} — +{merged_nodes} node(s), +{merged_edges} edge(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
