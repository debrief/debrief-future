# Contract: Copilot Customization Pack (US1–US3)

Binding placement, format, and sync rules for the workspace artefacts. The
drift check and unit tests enforce this contract in CI.

## Placement matrix

| Artefact | Canonical | Synced copy (preview workspace root) |
|---|---|---|
| Priming | `.github/copilot-instructions.md` | `preview/workspace/samples/.github/copilot-instructions.md` |
| Agent | `.github/agents/debrief-analyst.agent.md` | `preview/workspace/samples/.github/agents/debrief-analyst.agent.md` |
| Prompts ×8 | `.github/prompts/demo-*.prompt.md` | `preview/workspace/samples/.github/prompts/demo-*.prompt.md` |

Rules:
- Canonical is the only hand-edited location. Copies are byte-identical.
- `scripts/check-copilot-customization-drift.mjs` exits non-zero on any hash
  mismatch or missing copy; wired into `task lint` / CI lint step.
- `apps/vscode/.github/copilot-instructions.md` is deleted (content relocated).

## Agent file format (`debrief-analyst.agent.md`)

```markdown
---
name: Debrief Analyst
description: <one sentence, analyst-facing>
model: <pinned Sonnet-class picker id>
tools: ['debrief_searchPlots', 'debrief_summarizeCurrentPlot',
        'debrief_listTools', 'debrief_runTool'<, minimal built-ins>]
---
<embedded conventions: summarise-before-edit; list-before-run;
never fabricate ids/params; edits are unsaved>
```

## Prompt file format (`demo-<n>-<slug>.prompt.md`)

```markdown
---
agent: Debrief Analyst
description: <scenario title from #284>
---
<scenario utterance — verbatim-equivalent to the transcript-replay corpus>
```

Parity rule: a unit test asserts each prompt body matches the corresponding
utterance in `apps/vscode/tests/unit/copilot/scenarios.transcript.test.ts`'s
corpus (single source of scenario truth).

## Approval policy declaration

`apps/vscode/package.json`:

```jsonc
"contributes": {
  "configurationDefaults": {
    "chat.tools.eligibleForAutoApproval": { "debrief_runTool": false }
  }
}
```

Echoed in `preview/workspace/debrief-preview.code-workspace` `settings`.
The extension MUST NOT set any read-only tool to auto-approved; pre-approval
is a documented user action only (quickstart §Approvals).

## Degradation guarantees

- Hosts < 1.106: agent/prompt files inert; approval-eligibility key ignored;
  `prepareInvocation` confirmation + invoke-time mutation guard still gate
  every mutating run (unchanged #284 behaviour).
- Pinned model unavailable: host falls back to the user's default model with
  visible indication; no extension code involved.
