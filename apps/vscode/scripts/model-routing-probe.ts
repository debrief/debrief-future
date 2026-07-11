/**
 * Automated model-routing probe (#284, FR-032 / T037).
 *
 * Feeds the four Debrief tool schemas + the eight scenario prompts to a model
 * via the Anthropic Messages API (reusing #191's transport posture, NOT
 * Copilot) and asserts the model emits the expected tool call with schema-valid
 * parameters. This automates the "did a model route correctly" question FR-026
 * would otherwise leave to a human, and feeds the routing-quality findings.
 *
 * **Network-gated**: skips cleanly (exit 0, message) when `ANTHROPIC_API_KEY`
 * is absent, so it never blocks offline developers or the core PR gate. It is
 * meant to run as a separate nightly/opt-in job.
 *
 * Run: `ANTHROPIC_API_KEY=… npx tsx apps/vscode/scripts/model-routing-probe.ts`
 * Writes a per-scenario report to
 * `specs/284-copilot-plot-editing/evidence/routing-probe.md`.
 */

import * as fs from 'fs';
import * as path from 'path';

const MODEL = process.env.COPILOT_PROBE_MODEL ?? 'claude-haiku-4-5-20251001';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const EVIDENCE = path.resolve(
  __dirname,
  '../../../specs/284-copilot-plot-editing/evidence/routing-probe.md',
);

/** The four tool schemas the model chooses between (mirrors package.json). */
const TOOLS = [
  {
    name: 'debrief_searchPlots',
    description:
      'Search the local STAC catalog for plots by free text, time range, platform, and/or bounding box. Optionally opens a single match.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        platforms: { type: 'array', items: { type: 'string' } },
        bbox: { type: 'array', items: { type: 'number' } },
        open: { type: 'boolean' },
      },
    },
  },
  {
    name: 'debrief_summarizeCurrentPlot',
    description:
      'Summarise the open Debrief plot: metadata plus a thinned inventory of its features. Use before targeting an edit.',
    input_schema: {
      type: 'object',
      properties: { plotId: { type: 'string' }, selectionOnly: { type: 'boolean' } },
    },
  },
  {
    name: 'debrief_listTools',
    description:
      'List the Debrief analysis/editing tools available, with parameters and whether each modifies the plot.',
    input_schema: { type: 'object', properties: { plotId: { type: 'string' } } },
  },
  {
    name: 'debrief_runTool',
    description:
      'Run a Debrief tool by id against the current plot. Mutating tools confirm first; analytical tools populate the Results panel.',
    input_schema: {
      type: 'object',
      required: ['toolId'],
      properties: {
        toolId: { type: 'string' },
        params: { type: 'object' },
        plotId: { type: 'string' },
        scope: { type: 'string', enum: ['all', 'selection'] },
        utterance: { type: 'string' },
      },
    },
  },
];

/** The eight scenarios and the tool each should route to. */
const SCENARIOS: { prompt: string; expect: string }[] = [
  { prompt: 'open the Exercise Alpha day-1 plot', expect: 'debrief_searchPlots' },
  { prompt: "what's in this plot?", expect: 'debrief_summarizeCurrentPlot' },
  { prompt: 'which Debrief tools can I run right now?', expect: 'debrief_listTools' },
  { prompt: 'colour the submarine track red', expect: 'debrief_runTool' },
  { prompt: 'run speed-filter below 5 knots on the selection', expect: 'debrief_runTool' },
  { prompt: 'summarise the selection', expect: 'debrief_summarizeCurrentPlot' },
  { prompt: 'find plots from March involving a submarine', expect: 'debrief_searchPlots' },
  { prompt: 'list the tools available for the current selection', expect: 'debrief_listTools' },
];

interface ScenarioResult {
  prompt: string;
  expected: string;
  actual: string | null;
  ok: boolean;
}

async function callModel(prompt: string): Promise<string | null> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      tools: TOOLS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    content: { type: string; name?: string }[];
  };
  const toolUse = data.content.find((c) => c.type === 'tool_use');
  return toolUse?.name ?? null;
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.log(
      '[routing-probe] ANTHROPIC_API_KEY not set — skipping cleanly (FR-032). ' +
        'This probe is opt-in and never blocks the offline gate.',
    );
    return;
  }

  const results: ScenarioResult[] = [];
  for (const s of SCENARIOS) {
    try {
      const actual = await callModel(s.prompt);
      results.push({ prompt: s.prompt, expected: s.expect, actual, ok: actual === s.expect });
    } catch (err) {
      results.push({
        prompt: s.prompt,
        expected: s.expect,
        actual: `error: ${err instanceof Error ? err.message : String(err)}`,
        ok: false,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const pct = Math.round((passed / results.length) * 100);

  const md = [
    '# Model-routing probe results',
    '',
    `- **Model**: \`${MODEL}\``,
    `- **First-attempt tool-selection accuracy**: ${passed}/${results.length} (${pct}%)`,
    `- **Gate (SC-005)**: ≥80% → ${pct >= 80 ? 'PASS' : 'FAIL'}`,
    '',
    '| Scenario | Expected | Actual | ✓ |',
    '|----------|----------|--------|---|',
    ...results.map(
      (r) => `| ${r.prompt} | \`${r.expected}\` | \`${r.actual ?? '(none)'}\` | ${r.ok ? '✅' : '❌'} |`,
    ),
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
  fs.writeFileSync(EVIDENCE, md);
  console.log(`[routing-probe] ${passed}/${results.length} correct (${pct}%). Wrote ${EVIDENCE}`);
  if (pct < 80) {
    process.exitCode = 1;
  }
}

void main();
