# Quickstart — Verify the MCP → LinkML migration

**Feature**: 222-linkml-mcp-envelopes
**Date**: 2026-05-12
**Audience**: reviewers, /speckit.tasks author, future maintainers
running a regression check against this cluster.

Walks a fresh checkout of the feature branch through the acceptance
gates. Total wall-clock time on a 2024-vintage workstation ≈ 6–8 minutes.

## Prerequisites

```sh
# From repo root, on branch 222-linkml-mcp-envelopes
git status                    # should be clean
uv sync                       # Python deps for schema-build + adherence tests
pnpm install --frozen-lockfile
```

## Step 1 — Build the schemas

```sh
task schemas:build
# (or, if `task` is not installed:
#   cd shared/schemas && make all && cd ../..  )
```

**Pass criterion**: command exits 0 in ≤ 120% of pre-feature baseline
(NFR-001). Generated artefacts present:

```sh
ls shared/schemas/src/generated/python/mcp.py                  # new
ls shared/schemas/src/generated/typescript/mcp.ts              # new
ls shared/schemas/src/generated/json-schema/mcp.schema.json    # new
```

## Step 2 — Run schema-adherence tests

```sh
uv run pytest shared/schemas/tests/test_mcp_roundtrip.py \
              shared/schemas/tests/test_mcp_fixtures.py -v
```

**Pass criterion**: all tests green. Includes (per FR-006):

- Round-trip: Py → JSON → TS → JSON → Py for each named class.
- Schema-compare: LinkML JSON Schema ≡ Pydantic `model_json_schema()`.
- Golden + negative fixtures from `shared/schemas/tests/fixtures/mcp/`.

## Step 3 — Run the type-audit scanner

```sh
mkdir -p tmp
pnpm tsx scripts/audits/type-audit/scan.ts \
  --roots apps shared services \
  --exclude "shared/schemas/src/generated/**" \
  --exclude "**/__tests__/**" \
  --exclude "**/__fixtures__/**" \
  --exclude "**/*.test.ts" \
  --exclude "**/*.spec.ts" \
  --exclude "**/node_modules/**" \
  --exclude "**/dist/**" \
  --out tmp/type-audit.json
pnpm tsx scripts/audits/type-audit/generate-report.ts \
  --in tmp/type-audit.json \
  --out tmp/type-audit-report.md
```

**Pass criterion** (SC-001 / SC-002):

```sh
# Zero §3.1 rows attributed to #222:
grep -c "Open #222" tmp/type-audit-report.md
# expected: 0

# Zero ToolParameter rows in §3.2:
grep -c 'drift cluster "ToolParameter"' tmp/type-audit-report.md
# expected: 0
```

## Step 4 — Confirm no hand-types remain (SC-003)

```sh
# Hand-typed interfaces in the cluster MUST only appear under shared/schemas/.
git grep -nE "interface (MCPRequest|MCPToolResponse|MCPErrorResponse|MCPContentItem|MCPToolDefinition|MCPSelectionRequirement|MCPParamSchema|ToolDefinition|ToolParameter|ToolParameterMeta|ToolResult|ToolResultForLog|ToolExecutionResultForReplay|ToolsUpdateMessage)\b" \
  -- apps shared services \
  | grep -v "shared/schemas/" \
  | grep -v "shared/schemas/src/typescript/aliases/" \
  || echo "PASS — no hand-types remain"
```

**Pass criterion**: the `|| echo "PASS"` branch triggers.

```sh
# ToolName as keyof typeof should also be gone:
git grep -n "type ToolName = keyof typeof TOOLS" -- services/ apps/ shared/
# expected: no matches
```

## Step 5 — Run full project verify (SC-005)

```sh
task verify
# (or the four-step fallback in CLAUDE.md §Before Pushing)
```

**Pass criterion**: lint + typecheck + unit tests + Playwright E2E all
green. No new `// @ts-expect-error`, `# type: ignore`, `as any`, or
`Any` casts (the diff `git diff main...HEAD` should reveal only the
free-form `range: Any` fields documented in `mcp.yaml`).

## Step 6 — Spot-check a calc-tool invocation (SC-006)

Run the calc-tool Playwright E2E (path resolved during /speckit.tasks
per Research R-007):

```sh
cd apps/web-shell && node run-playwright.mjs <calc-tool-test-name>
```

**Pass criterion**: same fixture catalogue, same result rows in the
LogPanel, same parameter form rendered in ToolMatch.

## Step 7 — Confirm changelog updates (FR-010, SC-007)

```sh
git diff main...HEAD -- docs/type-audit-2026.md
# expected: a new §5 changelog entry crediting this spec, the merge
# git-SHA, and before/after row counts (17→0 for §3.1; 2→0 for
# §3.2 ToolParameter).

git diff main...HEAD -- shared/schemas/README.md
# expected: a new worked-example section for the MCP cluster (NFR-003).
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Step 2 fails on `test_mcp_roundtrip.py::test_<class>_roundtrip` | Generator emitted different field casing than the consumer expects | Verify per-package generator config in `shared/schemas/pyproject.toml`; regenerate (`task schemas:build`). |
| Step 3 still shows a §3.1 row | A consumer site was missed | Re-read `data-model.md` §"Class summary table" and check the listed file. |
| Step 4 prints a line under `shared/utils/` | `mcp-types.ts` deletion was incomplete | Confirm the file was deleted or reduced to re-exports only. |
| Step 5 `pnpm -r typecheck` fails on a webview file | Generator config issue | File an issue under `shared/schemas/`. |
| Step 6 Playwright fails on selector miss | Migration accidentally changed a `data-testid` | Roll back the affected webview file and inspect. |
