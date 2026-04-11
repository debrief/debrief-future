#!/usr/bin/env node
/**
 * Headless test harness for the STAC NL Filter PoC.
 *
 * Mirrors the browser app's search logic (system prompt → Claude → JSON
 * response → ID resolution) but runs in Node, using `claude -p` as the LLM
 * call instead of a direct fetch to api.anthropic.com. This lets us execute
 * typical analyst queries end-to-end without needing an API key in env.
 *
 * Usage:
 *   node test-harness.mjs                     # run all typical-phrase tests
 *   node test-harness.mjs --query "free form" # run a single ad-hoc query
 *   node test-harness.mjs --unit              # unit-only (no LLM calls)
 *
 * Requires: `claude` CLI available on PATH. Tests spawn it from an isolated
 * working directory so the child session does not inherit this repo's
 * CLAUDE.md or uncommitted-file state.
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_JS_PATH = path.join(__dirname, 'catalog-data.js');
const ISOLATED_CWD = '/tmp/claude-isolated-nl-filter';

// ===== Load catalog-data.js into a sandboxed window shim =====
function loadCatalogs() {
  const src = readFileSync(CATALOG_JS_PATH, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return {
    full: sandbox.window.CATALOG_FULL,
    compact: sandbox.window.CATALOG_COMPACT,
  };
}

const { full: CATALOG_FULL, compact: CATALOG_COMPACT } = loadCatalogs();
const ITEMS_BY_ID = Object.fromEntries(CATALOG_FULL.map(i => [i.id, i]));
const TOTAL_ITEMS = CATALOG_FULL.length;

// ===== Prompt builder — duplicated from app.jsx (keep in sync) =====
function buildSystemPrompt() {
  return `You are a search assistant for a STAC catalog of maritime exercise plots.

Given a user's natural-language query, identify which plots in the catalog match the query, and return a JSON object describing what you understood.

RULES:
1. Respond with RAW JSON only — no markdown code fences, no explanatory text, no preamble.
2. The JSON must have two top-level keys:
   - "chips": an object summarising what filters you extracted (all sub-keys optional)
   - "ids":   an array of matching plot ID strings from the catalog
3. If the query is too vague to filter on, return ALL catalog IDs with an empty "chips" object.
4. Only return IDs that appear in the catalog below.

SLUG SHAPE — each catalog item has this structure:
{
  id, title, exercise, plot_name,
  bbox, start_datetime, end_datetime, year, duration_hours,
  feature_kinds: { TRACK, NARRATIVE, ... },
  platform_count, narrative_count,
  platforms: [                              // PER-PLATFORM records — use these for joined queries
    {
      id,                                   // raw platform_id
      name,                                 // display name (e.g. "HMS Nelson")
      nationality,                          // ISO 2-letter code
      vessel_class,                         // full path e.g. "surface/warship/frigate/type23"
      vessel_type,                          // leaf, e.g. "type23"
      vessel_role,                          // role, e.g. "frigate" | "destroyer" | "submarine"
      domain,                               // "surface" | "subsurface" | "air"
      synthetic                             // true = metadata was fabricated (not authoritative)
    }
  ],
  nationalities, domains, vessel_types,     // derived aggregates across platforms[]
  has_submarine, has_warship,               // derived booleans
  tags, feature_tags
}

KEY REASONING PATTERNS:
- "UK submarines"          → platforms[*] where nationality=="GB" AND domain=="subsurface"
- "Type 23 frigates"       → platforms[*].vessel_type=="type23"
- "German warships"        → platforms[*] where nationality=="DE" AND vessel_role in {frigate,destroyer,corvette,carrier,patrol}
- "Anglo-American ASW"     → nationalities ⊇ {GB,US} AND tags ∋ "ASW"
- "Multi-platform plots"   → platform_count >= 3
- "Submerged operations"   → has_submarine == true
When a user asks about a specific nationality + vessel combination, you MUST match via platforms[] — the aggregate nationalities/vessel_types fields do not preserve the join.

CHIP KEYS (all optional — omit any with no value):
- nationality: string[]   — ISO 2-letter country codes (e.g. ["GB", "US"])
- vesselType:  string[]   — leaf values from platforms[*].vessel_type (e.g. "astute", "type45")
- domain:      string[]   — "surface" | "subsurface" | "air"
- exercise:    string[]   — exercise names (first half of "<Exercise>: <Plot>")
- tag:         string[]   — values matching tags or feature_tags
- year:        { from: number, to: number } — year range

CATALOG (${TOTAL_ITEMS} items):
${JSON.stringify(CATALOG_COMPACT)}

Return ONLY the JSON object.`;
}

// ===== JSON extraction (tolerates accidental markdown fences) =====
function extractJson(text) {
  const trimmed = (text || '').trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

// ===== Spawn `claude -p` and capture its result =====
function runClaudeQuery(query, { timeoutMs = 120000 } = {}) {
  mkdirSync(ISOLATED_CWD, { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--output-format', 'json',
      '--model', 'sonnet',
      '--system-prompt', buildSystemPrompt(),
    ];

    const child = spawn('claude', args, {
      cwd: ISOLATED_CWD,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude -p timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`claude -p exited with code ${code}\nstderr: ${stderr}`));
      }
      try {
        const envelope = JSON.parse(stdout);
        if (envelope.is_error) {
          return reject(new Error(`claude -p reported error: ${envelope.result}`));
        }
        resolve(envelope);
      } catch (e) {
        reject(new Error(`Failed to parse claude -p output: ${e.message}\nraw: ${stdout.slice(0, 500)}`));
      }
    });

    child.stdin.write(query);
    child.stdin.end();
  });
}

// ===== Run a single query through the full search pipeline =====
async function runQuery(query) {
  const envelope = await runClaudeQuery(query);
  const rawText = envelope.result || '';
  const jsonText = extractJson(rawText);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Model did not return valid JSON. Raw: ${rawText.slice(0, 400)}`);
  }

  const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
  const matched = ids.map(id => ITEMS_BY_ID[id]).filter(Boolean);
  const unknownIds = ids.filter(id => !ITEMS_BY_ID[id]);

  return {
    query,
    chips: parsed.chips || {},
    ids,
    matched,
    unknownIds,
    cost: envelope.total_cost_usd,
    duration: envelope.duration_ms,
  };
}

// ===== Unit tests (pure — no LLM calls) =====
function runUnitTests() {
  const results = [];
  const assert = (name, cond, detail = '') => {
    results.push({ name, pass: !!cond, detail });
  };

  // Catalog integrity
  assert('catalog has 70 items', CATALOG_FULL.length === 70, `got ${CATALOG_FULL.length}`);
  assert('compact matches full count', CATALOG_COMPACT.length === CATALOG_FULL.length);
  assert('core--bulk-red-tracks excluded',
    !ITEMS_BY_ID['core--bulk-red-tracks']);
  assert('compact omits description',
    CATALOG_COMPACT.every(i => !('description' in i)));
  assert('full retains description for most items',
    CATALOG_FULL.filter(i => i.description).length > 60);

  // v2 slug shape — per-platform records
  assert('every item has platforms array',
    CATALOG_FULL.every(i => Array.isArray(i.platforms)));
  assert('every item has platform_count matching platforms.length',
    CATALOG_FULL.every(i => i.platform_count === i.platforms.length));
  assert('every platform has nationality + vessel_class + domain',
    CATALOG_FULL.every(i => i.platforms.every(p =>
      p.nationality && p.vessel_class && p.domain)));
  assert('derived nationalities matches platforms[*].nationality (set)',
    CATALOG_FULL.every(i => {
      const derived = new Set(i.platforms.map(p => p.nationality));
      const stored = new Set(i.nationalities);
      return derived.size === stored.size && [...derived].every(n => stored.has(n));
    }));
  assert('has_submarine matches any platform domain=="subsurface"',
    CATALOG_FULL.every(i => i.has_submarine === i.platforms.some(p => p.domain === 'subsurface')));

  // NELSON/COLLINGWOOD are known platforms (not synthetic)
  const sample = ITEMS_BY_ID['core--sample'];
  assert('core--sample has HMS Nelson and HMS Collingwood',
    sample && sample.platforms.some(p => p.name === 'HMS Nelson')
           && sample.platforms.some(p => p.name === 'HMS Collingwood'));
  assert('core--sample platforms are not synthetic',
    sample && sample.platforms.every(p => p.synthetic === false));

  // At least some items have submarines (the whole point of the enrichment)
  assert('at least one plot has has_submarine=true',
    CATALOG_FULL.some(i => i.has_submarine));
  assert('at least one plot has UK submarine (GB+subsurface join)',
    CATALOG_FULL.some(i => i.platforms.some(p => p.nationality === 'GB' && p.domain === 'subsurface')));

  // extractJson
  assert('extractJson: raw passthrough',
    extractJson('{"ok":true}') === '{"ok":true}');
  assert('extractJson: strips ```json fence',
    extractJson('```json\n{"ok":true}\n```') === '{"ok":true}');
  assert('extractJson: strips ``` fence',
    extractJson('```\n{"ok":true}\n```') === '{"ok":true}');
  assert('extractJson: trims whitespace',
    extractJson('   {"ok":true}   ') === '{"ok":true}');

  // System prompt references the v2 shape
  const sp = buildSystemPrompt();
  assert('system prompt describes per-platform slug',
    sp.includes('platforms: [') && sp.includes('PER-PLATFORM records'));
  assert('system prompt mentions 70 items',
    sp.includes('70 items'));
  assert('system prompt gives UK-submarine example',
    sp.includes('UK submarines'));

  return results;
}

// ===== Integration tests — typical analyst phrases =====
// Validators assert against fields on the v2 slug (platforms[], nationalities,
// domains, vessel_types, has_submarine, etc). They're lenient about exact ID
// lists — they verify the *shape* of the result, not a golden set.
const TYPICAL_QUERIES = [
  {
    name: 'UK-only filter',
    query: 'Plots involving British Royal Navy ships only',
    validate: r => {
      const allGB = r.matched.every(item =>
        (item.nationalities || []).length === 1 && item.nationalities[0] === 'GB');
      return {
        pass: r.matched.length > 0 && allGB,
        note: `${r.matched.length} matched; all strictly GB-only: ${allGB}`,
      };
    },
  },
  {
    name: 'UK submarines (per-platform join)',
    query: 'Plots that feature a UK submarine',
    validate: r => {
      const everyHasUKSub = r.matched.every(item =>
        (item.platforms || []).some(p => p.nationality === 'GB' && p.domain === 'subsurface'));
      return {
        pass: r.matched.length > 0 && everyHasUKSub,
        note: `${r.matched.length} matched; every one has a GB subsurface platform: ${everyHasUKSub}`,
      };
    },
  },
  {
    name: 'German frigates (per-platform join)',
    query: 'German frigates',
    validate: r => {
      const everyHasDEFrigate = r.matched.every(item =>
        (item.platforms || []).some(p => p.nationality === 'DE' && p.vessel_role === 'frigate'));
      return {
        pass: r.matched.length > 0 && everyHasDEFrigate,
        note: `${r.matched.length} matched; every one has a DE frigate: ${everyHasDEFrigate}`,
      };
    },
  },
  {
    name: 'NATO ASW exercises',
    query: 'NATO anti-submarine warfare training exercises',
    validate: r => {
      const hasASWTag = r.matched.some(item => {
        const tags = [...(item.tags || []), ...(item.feature_tags || [])];
        return tags.some(t => t.toLowerCase().includes('asw') || t.toLowerCase().includes('submarine'));
      });
      return {
        pass: r.matched.length > 0 && hasASWTag,
        note: `${r.matched.length} matched; any ASW-tagged: ${hasASWTag}`,
      };
    },
  },
  {
    name: 'Multi-national ≥3 nations',
    query: 'Multi-national exercises with at least 3 different nationalities',
    validate: r => {
      const allMulti = r.matched.every(item => (item.nationalities || []).length >= 3);
      return {
        pass: r.matched.length > 0 && allMulti,
        note: `${r.matched.length} matched; all have ≥3 nats: ${allMulti}`,
      };
    },
  },
  {
    name: 'Type 23 frigates',
    query: 'plots featuring Type 23 frigates',
    validate: r => {
      const everyHasT23 = r.matched.every(item =>
        (item.platforms || []).some(p => p.vessel_type === 'type23'));
      return {
        pass: r.matched.length > 0 && everyHasT23,
        note: `${r.matched.length} matched; all contain a Type 23: ${everyHasT23}`,
      };
    },
  },
  {
    name: 'Vague query returns all',
    query: 'show me everything',
    validate: r => ({
      pass: r.matched.length >= TOTAL_ITEMS - 2,
      note: `${r.matched.length}/${TOTAL_ITEMS} returned`,
    }),
  },
  {
    name: 'Year-range filter',
    query: 'exercises from the 1990s',
    validate: r => {
      const in90s = r.matched.every(item => item.year >= 1990 && item.year <= 1999);
      return {
        pass: r.matched.length > 0 && in90s,
        note: `${r.matched.length} matched; all in 1990s: ${in90s}`,
      };
    },
  },
  {
    name: 'Narrative content',
    query: 'plots with many narrative entries',
    validate: r => {
      const hasNarrative = r.matched.every(item => (item.narrative_count || 0) > 0);
      return {
        pass: r.matched.length > 0 && hasNarrative,
        note: `${r.matched.length} matched; all have narratives: ${hasNarrative}`,
      };
    },
  },
];

// ===== Test runner =====
async function runIntegrationTests() {
  const results = [];
  console.log(`\nRunning ${TYPICAL_QUERIES.length} integration tests (LLM calls)...\n`);

  for (const test of TYPICAL_QUERIES) {
    process.stdout.write(`  [${test.name}] `);
    const t0 = Date.now();
    try {
      const result = await runQuery(test.query);
      const v = test.validate(result);
      const icon = v.pass ? 'PASS' : 'FAIL';
      const chipsStr = Object.keys(result.chips).length
        ? ' chips=' + JSON.stringify(result.chips)
        : ' chips={}';
      console.log(`${icon}  (${result.matched.length} hits, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      console.log(`      query: "${test.query}"`);
      console.log(`      ${v.note}`);
      console.log(`     ${chipsStr}`);
      if (result.unknownIds.length > 0) {
        console.log(`      ⚠ unknown IDs returned: ${result.unknownIds.join(', ')}`);
      }
      results.push({ name: test.name, pass: v.pass, note: v.note, hits: result.matched.length });
    } catch (e) {
      console.log(`ERROR  ${e.message}`);
      results.push({ name: test.name, pass: false, note: e.message, hits: 0 });
    }
    console.log('');
  }

  return results;
}

// ===== CLI entry =====
async function main() {
  const args = process.argv.slice(2);
  const unitOnly = args.includes('--unit');
  const queryIdx = args.indexOf('--query');
  const adHocQuery = queryIdx >= 0 ? args[queryIdx + 1] : null;

  console.log('=== STAC NL Filter — Headless Test Harness ===');
  console.log(`Catalog: ${CATALOG_FULL.length} items (full) / ${CATALOG_COMPACT.length} items (compact)`);
  console.log(`System prompt size: ${(buildSystemPrompt().length / 1024).toFixed(1)} KB`);

  // Unit tests always run
  console.log('\n--- Unit tests ---');
  const unit = runUnitTests();
  for (const r of unit) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  }
  const unitFailed = unit.filter(r => !r.pass).length;
  console.log(`\n  ${unit.length - unitFailed}/${unit.length} passed`);

  if (unitOnly) {
    process.exit(unitFailed === 0 ? 0 : 1);
  }

  // Ad-hoc query mode
  if (adHocQuery) {
    console.log(`\n--- Ad-hoc query: "${adHocQuery}" ---`);
    try {
      const r = await runQuery(adHocQuery);
      console.log(`  chips: ${JSON.stringify(r.chips, null, 2)}`);
      console.log(`  matched ${r.matched.length} items:`);
      for (const item of r.matched) {
        console.log(`    - ${item.id}  ${item.title}`);
      }
      process.exit(0);
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      process.exit(1);
    }
  }

  // Full integration suite
  const integration = await runIntegrationTests();
  const intFailed = integration.filter(r => !r.pass).length;

  console.log('--- Summary ---');
  console.log(`  Unit:        ${unit.length - unitFailed}/${unit.length} passed`);
  console.log(`  Integration: ${integration.length - intFailed}/${integration.length} passed`);

  process.exit((unitFailed + intFailed) === 0 ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
