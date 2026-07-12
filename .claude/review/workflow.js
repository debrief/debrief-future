// Repo-review orchestration workflow (spec 282, FR-004 / research.md R-007).
//
// Invoked by the /repo-review skill via the Workflow tool. Plain JavaScript —
// the Workflow runtime does not accept TypeScript (plan.md Complexity Tracking).
//
// Shape (R-007):
//   Phase A  recon      — one agent builds the work-list (cells = area × dimension)
//   Phase B  review→verify pipeline — per cell: reviewer emits candidates, each
//            candidate fans out to an adversarial verifier immediately (no barrier)
//   Phase C  evidence    — knip, dependency audit, strict lint, coverage, mutation
//   Phase D  synthesis   — one agent: dedup, themes, guards, reconcile, write report
//
// Budget: uncapped but instrumented (FR-012). Every cell logs what it covered;
// shortfalls are recorded, never silently trimmed.
//
// `args` is passed by the skill: { gitSha, runDate, tierMapPath, playbookDir,
// ledgerPath, evidenceDir, priorLedgerExists }.

export const meta = {
  name: 'repo-review',
  description: 'Whole-repo review: recon, per-cell review+adversarial verify, evidence, synthesis',
  phases: [
    { title: 'Recon', detail: 'build the area × dimension work-list from the tier map' },
    { title: 'Review', detail: 'per-cell reviewers emit candidate findings' },
    { title: 'Verify', detail: 'adversarial verifier per candidate — refute or confirm' },
    { title: 'Evidence', detail: 'knip, dependency audit, strict lint, coverage, mutation checks' },
    { title: 'Synthesis', detail: 'dedup, themes, guards, reconcile ledger, write report' },
  ],
}

const CANDIDATE_SCHEMA = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'dimension', 'module_path', 'defect_slug', 'title',
          'failure_scenario', 'locations', 'heuristic', 'proposed_severity',
          'proposed_effort',
        ],
        properties: {
          dimension: { enum: ['constitution', 'correctness', 'tech-debt', 'test-quality'] },
          module_path: { type: 'string' },
          defect_slug: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
          title: { type: 'string' },
          failure_scenario: { type: 'string' },
          locations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['file', 'line'],
              properties: { file: { type: 'string' }, line: { type: 'integer' } },
            },
          },
          heuristic: { type: 'string' },
          proposed_severity: { enum: ['critical', 'high', 'medium', 'low'] },
          proposed_effort: { enum: ['S', 'M', 'L'] },
          suspected_test_file: { type: 'string' }, // triggers a mutation spot-check
        },
      },
    },
    coverage_note: { type: 'string' }, // what this cell did and did not reach
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['confirmed', 'reason'],
  properties: {
    confirmed: { type: 'boolean' },       // false = refuted OR undecided (verified-only bar)
    undecided: { type: 'boolean' },       // distinguishes refuted from could-not-decide
    reason: { type: 'string' },
    verification: { type: 'string' },     // how it was confirmed (for the ledger)
  },
}

// --- Phase A: recon --------------------------------------------------------
phase('Recon')
const recon = await agent(
  `Read ${args.tierMapPath}. Build the review work-list: one CELL per (reviewable area,
   dimension) pair. Tier-1 areas get all four dimensions at per-file depth; Tier-2 at
   subsystem depth; Tier-3 as a sweep. For each cell output {area, tier, dimension, depth,
   files: [...]}. Also list any area you are deliberately NOT covering and why. Return JSON
   {cells: [...], skipped: [{area, reason}]}.`,
  {
    phase: 'Recon',
    schema: {
      type: 'object',
      required: ['cells', 'skipped'],
      properties: {
        cells: { type: 'array', items: { type: 'object' } },
        skipped: { type: 'array', items: { type: 'object' } },
      },
    },
  },
)
const cells = (recon && recon.cells) || []
log(`recon: ${cells.length} cells, ${((recon && recon.skipped) || []).length} areas skipped`)

// --- Phase B: review → verify pipeline (no barrier) ------------------------
const playbookByDimension = {
  constitution: `${args.playbookDir}/constitution.md`,
  correctness: `${args.playbookDir}/correctness.md`,
  'tech-debt': `${args.playbookDir}/tech-debt.md`,
  'test-quality': `${args.playbookDir}/test-quality.md`,
}

const perCell = await pipeline(
  cells,
  // Stage 1 — review this cell.
  (cell) =>
    agent(
      `Review ${cell.area} (tier ${cell.tier}, ${cell.depth} depth) for the ${cell.dimension}
       dimension. Apply the heuristics in ${playbookByDimension[cell.dimension]} — cite the
       heuristic id on every candidate (or "(unprompted)"). Only emit a candidate if you can
       state a concrete failure scenario or a specific violated constitution article. Assign a
       kebab-case defect_slug that names the defect (not the location). If a test looks like it
       asserts a mock / never fails, set suspected_test_file so a mutation spot-check runs.`,
      { label: `review:${cell.area}:${cell.dimension}`, phase: 'Review', schema: CANDIDATE_SCHEMA },
    ),
  // Stage 2 — adversarially verify each candidate from this cell, concurrently.
  (review, cell) =>
    parallel(
      ((review && review.candidates) || []).map((cand) => () =>
        agent(
          `Adversarially verify this candidate finding. Try to REFUTE it against the actual
           code. It survives ONLY if you positively confirm the defect exists and the failure
           scenario holds. If you cannot decide, mark undecided=true (it will be dropped —
           verified-only means confirmed, not merely unrefuted).\n\n${JSON.stringify(cand)}`,
          { label: `verify:${cand.defect_slug}`, phase: 'Verify', schema: VERDICT_SCHEMA },
        ).then((verdict) => ({ cand, verdict, cell })),
      ),
    ),
)

// Flatten; keep only confirmed (FR-005). Track counts for the methodology section.
const verified = perCell.flat().filter(Boolean)
const confirmed = verified.filter((v) => v.verdict && v.verdict.confirmed && !v.verdict.undecided)
const refuted = verified.filter((v) => v.verdict && !v.verdict.confirmed && !v.verdict.undecided)
const dropped = verified.filter((v) => v.verdict && v.verdict.undecided)
log(`candidates: ${verified.length} emitted → ${confirmed.length} confirmed, ${refuted.length} refuted, ${dropped.length} dropped-undecided`)

// --- Phase C: evidence (parallel; failures degrade to qualitative) ---------
phase('Evidence')
const suspectTests = confirmed
  .map((v) => v.cand.suspected_test_file)
  .filter(Boolean)

const evidence = await parallel([
  () => agent(
    `Run knip using the repo knip.json and capture its output to ${args.evidenceDir}. Also run
     a cross-file dependency-version audit over every package.json and pyproject.toml (reuse the
     #172 skew categories). Return {deadCode: [...], skew: [...], toolFailures: [...]}.`,
    { label: 'evidence:static', phase: 'Evidence', schema: { type: 'object' } },
  ),
  () => agent(
    `Run the report-only strict lint passes: ruff --config .claude/review/ruff-strict.toml and
     eslint --config .claude/review/eslint-strict.config.mjs. Capture raw output to
     ${args.evidenceDir}. Return leads (NOT findings) as {ruff: [...], eslint: [...],
     toolFailures: [...]}. These are leads for reviewers, already verified above.`,
    { label: 'evidence:lint', phase: 'Evidence', schema: { type: 'object' } },
  ),
  () => agent(
    `Measure coverage: uv run pytest --cov --cov-report=json and per-package vitest --coverage
     (JSON summary), excluding Playwright E2E. Capture to ${args.evidenceDir}. Return
     {pythonByPackage: {...}, tsByPackage: {...}, leastCoveredTier1: [...], toolFailures: [...]}.`,
    { label: 'evidence:coverage', phase: 'Evidence', schema: { type: 'object' } },
  ),
  // Mutation spot-checks — one disposable worktree per suspect test (R-006).
  ...suspectTests.map((testFile) => () =>
    agent(
      `Mutation spot-check for a suspicious test in ${testFile}. Introduce a targeted breakage
       in the code under test (invert a condition / return a wrong value at the asserted path),
       then run ONLY that test file. If it still passes, the test does not verify behaviour —
       confirm the finding. Discard the worktree. Return {testFile, stillPassed: bool}.`,
      { label: `mutate:${testFile}`, phase: 'Evidence', isolation: 'worktree', schema: { type: 'object' } },
    ),
  ),
])

// --- Phase D: synthesis (single agent — theme clustering needs the full set) --
phase('Synthesis')
const synthesis = await agent(
  `You are the synthesis pass for a repo review of ${args.gitSha} (${args.runDate}).

   Confirmed findings (verified-only): ${JSON.stringify(confirmed.map((v) => ({ ...v.cand, verification: v.verdict.verification })))}
   Evidence: ${JSON.stringify(evidence.filter(Boolean))}
   Recon skipped areas: ${JSON.stringify((recon && recon.skipped) || [])}
   Counts: emitted=${verified.length} confirmed=${confirmed.length} refuted=${refuted.length} dropped=${dropped.length}

   Do ALL of the following and report what you wrote:
   1. Dedup findings; assign final severity/effort from .claude/review/severity-rubric.md.
   2. Cluster findings sharing a root pattern (>= 2 members) into named themes; for each theme
      propose exactly ONE typed guard (lint-rule | ci-gate | claude-md | constitution-amendment
      | playbook-update), concrete enough to implement without re-analysis (FR-017).
   3. Reconcile against the ledger: write the confirmed findings to a JSON file and call
      \`python scripts/review-ledger.py reconcile --run-findings <file> --date ${args.runDate}
      --sha ${args.gitSha}\` (dry run first), decide any stage-2 pairings, then re-run with
      --pairings and --write. New findings get RR ids; disappeared open defects become fixed.
   4. Write the report to docs/project_notes/reviews/${args.runDate}-repo-review.md from
      .claude/review/report-template.md — fill front matter (spend/agents/candidate counts),
      Quick Wins, Themes & Prevention, four dimension chapters (each present even if empty),
      the Coverage Manifest (every cell + every recon-skipped area with reason — FR-003/FR-012),
      Methodology with the per-heuristic confirmed/refuted table, and Playbook Tuning.
   5. Memory (FR-018): append confirmed Critical/High correctness findings to
      docs/project_notes/bugs.md; draft a failure-pattern doc for any theme with >= 3 members.
   6. Do NOT modify any file outside docs/project_notes/reviews/, bugs.md, and new
      failure-pattern docs (FR-011). Guard proposals and playbook tuning are advisory only.`,
  { phase: 'Synthesis', effort: 'high', schema: { type: 'object' } },
)

return {
  gitSha: args.gitSha,
  runDate: args.runDate,
  confirmed: confirmed.length,
  refuted: refuted.length,
  dropped: dropped.length,
  synthesis,
}
