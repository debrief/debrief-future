# Research: Copilot Chat Integration Best-Practices Upgrade (285)

All Technical Context unknowns resolved. Sources: VS Code official docs
(`code.visualstudio.com/api/extension-guides/ai/*`, `/docs/agent-customization/`,
release notes 1.102/1.103/1.106), the #284 findings report
(`specs/284-copilot-plot-editing/evidence/findings-report.md`), and repo
inspection (2026-07-11).

## R1 — Priming file placement + canonical source

**Decision**: Canonical priming lives at repo-root `.github/copilot-instructions.md`
(relocated from `apps/vscode/.github/`). A synced copy is committed at
`preview/workspace/samples/.github/copilot-instructions.md` because the preview
Code Server opens `preview/workspace/debrief-preview.code-workspace`, whose only
folder is `samples/` — that folder is the workspace root the host scans.
A CI script (`scripts/check-copilot-customization-drift.mjs`) fails when any
synced copy's content hash differs from the canonical file (covers agents/ and
prompts/ copies too).

**Rationale**: VS Code applies `.github/copilot-instructions.md` only at the
workspace root of the opened folder/workspace. The #284 file at
`apps/vscode/.github/` is loaded in neither demo workspace — confirmed by
inspecting `preview/entrypoint.sh` (opens the `.code-workspace`) and the
workspace file (single folder `samples`).

**Alternatives considered**: Symlinks (rejected — fragile across git on
Windows and Docker COPY); single root-only file (rejected — the preview
workspace root is `samples/`, not the repo root, so it would still miss the
primary demo surface); build-time copy in Dockerfile.preview only (rejected —
invisible in the repo, drift risk inverted, and desktop users opening
`samples/` directly would miss it).

## R2 — Custom agent definition

**Decision**: `.github/agents/debrief-analyst.agent.md` (VS Code 1.106+
convention; older `.chatmode.md` name auto-migrates, older hosts ignore the
file entirely). Front matter: `name: Debrief Analyst`, `description` in analyst
terms, `model` pinned to a Sonnet-class Copilot picker entry (exact id chosen
at implementation time from the current picker; #284 routing probe justifies
the class), `tools:` restricted to the four `debrief_*` tools plus the minimal
built-ins the scenarios require (determined empirically per spec Assumption;
expected: none or search-only). Body embeds the tool-usage conventions
(summarise-before-edit, list-before-run, never fabricate ids) so the persona
carries them independent of workspace instructions (FR-005).

**Rationale**: Restricting the tool list is the reliable routing lever —
community experience (and the #284 probe's model-sensitivity finding) shows
models ignore *instructions* about tool choice far more often than they escape
a restricted tool *list*. A pinned model makes demos reproducible; VS Code
falls back to the user's default model with a visible indication when the
pinned model is unavailable (FR-006 satisfied by host behaviour — documented
in quickstart, no code needed).

**Alternatives considered**: Chat participant (`@debrief`) — rejected: platform
direction is agent-mode tools; a participant forks the interaction model away
from the E13 loop we're researching. Toolsets (`toolsets.jsonc`) alone —
rejected as primary: user-profile-scoped, not committable workspace content;
may be mentioned in docs as optional convenience.

## R3 — Scenario prompt files

**Decision**: Eight `.github/prompts/demo-*.prompt.md` files, one per #284
scenario (5 happy-path, 3 fail-safe), named to sort in demo order
(`demo-1-open-plot.prompt.md` …). Front matter pins `agent: Debrief Analyst`
(and thereby model + tools); body is the scenario utterance plus minimal
context. Prompts appear as `/demo-…` slash commands. The scenario text is kept
verbatim-equivalent to the transcript-replay fixtures so the replay suite and
the live prompts cannot drift apart (a unit test asserts the prompt bodies
match the replay corpus utterances).

**Rationale**: Prompt files are the platform's sanctioned reproducible-demo
surface (Burke Holland's instructions/prompts/agents decision matrix; official
docs). Tying them to the replay corpus keeps FR-008 testable and prepares the
ground for the future sequence-aware routing harness (out of scope here) to
reuse the same corpus.

**Alternatives considered**: Documentation-only scripted prompts (status quo —
rejected: free-typing degrades live demos and permits drift); VS Code tasks or
snippets (rejected: not chat-native, no agent/model pinning).

## R4 — Approval policy: bypass-proof mutation gate, frictionless read-only

**Decision**: Two-layer approach.
1. `apps/vscode/package.json` `configurationDefaults` contributes
   `chat.tools.eligibleForAutoApproval` marking `debrief_runTool` **not**
   eligible — host-level blanket auto-approve (`chat.tools.global.autoApprove`,
   "/yolo") then cannot bypass the confirmation. The same defaults are echoed
   in `preview/workspace/debrief-preview.code-workspace` settings so the
   preview enforces it even if extension-contributed defaults are overridden.
2. Read-only tools are NOT auto-approved by us. Quickstart documents the
   one-time "Chat: Manage Tool Approval" workspace pre-approval of
   `debrief_searchPlots`, `debrief_summarizeCurrentPlot`, `debrief_listTools`
   (host 1.106+ supports approving all tools from an extension in one action).

**Rationale**: FR-010 requires the gate to survive user convenience settings;
`eligibleForAutoApproval` is the host's mechanism for exactly this. FR-012
forbids the extension silently granting approval — pre-approval must remain a
user/host action, hence documentation not code. Defence in depth (FR-013): the
existing `prepareInvocation` `confirmationMessages` gate and the invoke-time
`mutation/*` guard (from #284, T025) remain untouched, so hosts predating the
setting still confirm.

**Alternatives considered**: Marking read-only tools eligible-and-approved
programmatically — no such API exists, and it would violate FR-012's
user-controlled principle. Doing nothing (status quo) — rejected: a demo under
"/yolo" would silently apply mutations, undermining the defence-posture story.

## R5 — Compact serialization (quick win)

**Decision**: `resultHelpers.jsonResult()` drops the `null, 2` pretty-print
arguments — single-line JSON. `approxTokens` continues to be computed over the
emitted payload (it already stringifies the same value, so it becomes honest
automatically). A fixture test asserts ≥15% payload reduction at each #284
probe size (SC-005).

**Rationale**: Indentation is pure token cost with zero model value; the #284
probe numbers were measured over pretty-printed output, so this alone buys
budget headroom and corrects the standing E13 dataset.

**Alternatives considered**: None serious — this is strictly better. (CSV/
tabular encodings rejected: loses the schema-shaped structure the model uses.)

## R6 — Budget-aware summary via prompt-tsx

**Decision**: Add `@vscode/prompt-tsx` (pinned). New `summaryPrompt.tsx`
renders the plot summary as a priority-ranked element tree; `invoke()` in
`summarizeCurrentPlotTool.ts` calls `renderElementJSON(element, props,
options.tokenizationOptions)` and returns a `LanguageModelPromptTsxPart`,
falling back to the compact-text path when the host passes no
`tokenizationOptions` (older hosts / direct `invokeTool` callers — and the
existing text path is kept for the transcript-replay tests). Priority order
(highest survives longest): plot identity + counts + truncation notice →
feature id/name/type → per-feature time spans → spatial digest. The
`INVENTORY_CAP = 200` remains only as a final backstop, no longer the primary
size control (FR-015). When pruning occurs the rendered output includes the
partial-inventory notice with narrowing guidance (FR-016).

**Rationale**: prompt-tsx is the host's sanctioned budget mechanism — it prunes
against the *caller's actual tokenizer and budget* rather than our char/4
heuristic. Priority ranking implements FR-015's documented shed order.

**Alternatives considered**: Hand-rolled pruning against `approxTokens`
(rejected — duplicates host machinery, wrong tokenizer, more code to test);
raising/lowering INVENTORY_CAP (rejected — blunt, feature-count is a poor
proxy for tokens once digests vary per feature).

## R7 — Spatial digest

**Decision**: Per-feature coarse digest computed from the feature's bbox
centroid relative to the plot-wide bbox: a 3×3 compass-sector label
(`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`, `C`) plus a relative-extent bucket
(`pt` | `local` | `wide` — fraction of plot bbox diagonal). Emitted as a short
string field (e.g. `"NW/wide"`), omitted for features without geometry
(never fabricated — edge case in spec). Cost ≈ 3–8 chars/feature, measured in
the regenerated token probe (FR-018).

**Rationale**: Closes the #284 Q2 gap ("the northern track") with the smallest
token footprint that still resolves positional references; sector+extent is
deterministic (Article I.4 reproducibility) and needs no geometry in the
summary.

**Alternatives considered**: Centroid lat/lon (rejected — numeric coordinates
cost more tokens and models reason worse over raw numbers than labels);
per-feature bbox (rejected — 4 numbers/feature blows the budget on large
plots); leaving to a follow-up drill-down tool (rejected — spec requires
summary-only resolution, SC-006).

## R8 — MCP registration for the existing Python STAC server

**Decision**: `contributes.mcpServerDefinitionProviders` in package.json +
`vscode.lm.registerMcpServerDefinitionProvider('debrief.stacMcp', provider)` in
a new `src/copilot/mcpProvider.ts`. The provider returns one
`McpStdioServerDefinition` launching the existing server
(`debrief_stac.mcp_server:main`, FastMCP over stdio) using the same Python
interpreter resolution `calcService` already performs, with the catalog path
from `debrief.stacCatalogPath`. Registration is wrapped in a capability check
(`'registerMcpServerDefinitionProvider' in vscode.lm`) and try/catch — startup
failure logs a diagnostic and leaves the LM tools untouched (FR-021). The
existing `debrief.mcp.autoStart` setting (already present in the preview
workspace, currently `false`) gates the experiment on/off, satisfying the
comparison protocol's need to disable one side per run.

**Rationale**: FR-019's "no manual per-user server configuration" is exactly
what `McpServerDefinitionProvider` exists for; the Python server already
exposes catalog search, so the extension work is registration glue only (spec
Assumption). Reusing `calcService`'s interpreter resolution avoids a second
Python-discovery code path.

**Alternatives considered**: Asking users to add the server to their user-level
`mcp.json` (rejected — manual, violates FR-019); HTTP transport
(`McpHttpServerDefinition`) (rejected — stdio is what the server implements and
avoids a port); porting search to a Node MCP server (rejected — duplicates the
Python service, violates the reuse assumption and Article IV thin-wrapper
intent).

## R9 — Comparison protocol (US5 evidence)

**Decision**: Fixed query matrix (text / time / platform / bbox × 3 catalog
fixtures) executed under two configurations: (A) MCP server enabled +
`debrief_searchPlots` disabled via the tool picker, (B) inverse. Result-set
parity asserted by an automated script against the catalog fixtures (FR-020,
SC-007); routing outcome + latency recorded per scenario run in the live
preview session; findings note written to
`evidence/mcp-vs-lmtool-comparison.md` following the #284 findings-report
discipline (FR-022).

**Rationale**: Both-enabled runs are non-deterministic about which tool the
model picks (spec edge case) — disable-one-side-per-run is the only clean
control.

## R10 — Host-version posture

**Decision**: Keep `engines.vscode` at the current ^1.99. Custom agents,
prompt files, approval-eligibility settings, and the MCP provider are all
either inert files or capability-checked API on older hosts; the four LM tools
behave exactly as in #284 there (graceful-degradation edge case in spec).
Quickstart states 1.106+ as the "full experience" version.

**Rationale**: No hard dependency on newest host features (spec edge case);
bumping engines would gate the whole extension on 1.106 for what is
workspace-content sugar.
