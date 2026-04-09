/**
 * Regression: real Python range-bearing MCP output flows through
 * `parseMcpResponseForTest()` as a DATASET CARRIER, not as an artifact.
 *
 * This test reproduces the user-reported bug (third round):
 *
 *   "I selected two tracks, and ran 'Range-bearing'. No graph was shown."
 *
 * Root cause: the Python `range-bearing` tool has
 * `output_kind="dataset/range_bearing_series"`.  The Python MCP result
 * builder wraps such outputs with `build_artifact(...)` which sets
 * `debrief:resultType="artifact/dataset/range_bearing_series"` and
 * `debrief:href=<filename>`.
 *
 * Before the fix, `CalcService.executeToolOnMcp` saw the `debrief:href`
 * annotation and routed the whole payload into `artifactData` —
 * skipping the `geoFeatures` array.  Downstream `executeTool.ts` then:
 *   - created a result layer (because of `artifactData`),
 *   - auto-persisted the carrier to STAC as an artifact file,
 *   - did NOT call `resultsPanelService.addDatasetsForToolResult` because
 *     `datasetCarrierFeatures.length === 0`.
 *
 * Result: user saw the completion toast + a result file in the Associated
 * Files dropdown, but no graph in the Results panel.
 *
 * The fix detects `artifact/dataset/*` result types and routes the parsed
 * carrier feature into `geoFeatures` instead.  This test runs the REAL
 * Python `debrief_calc.cli` with two tracks and verifies the returned
 * structure has `features.features.length === 1` with `__datasets` in
 * the feature's properties — i.e. a carrier ready for the Results panel.
 *
 * Feature: 178-vscode-tabular-results
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { parseMcpResponseForTest } from '../../src/services/calcService';

// Spawn the Python CLI with two-track input and capture stdout.
function runPythonRangeBearing(): string {
  const input = JSON.stringify({
    tool: 'range-bearing',
    features: [
      {
        type: 'Feature',
        id: 'track-a',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-2.0, 50.0],
            [-1.9, 50.1],
            [-1.8, 50.2],
          ],
        },
        properties: {
          name: 'Track A',
          kind: 'TRACK',
          positions: [
            { time: '2024-06-15T10:00:00Z' },
            { time: '2024-06-15T10:05:00Z' },
            { time: '2024-06-15T10:10:00Z' },
          ],
        },
      },
      {
        type: 'Feature',
        id: 'track-b',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-1.5, 50.0],
            [-1.4, 50.1],
            [-1.3, 50.2],
          ],
        },
        properties: {
          name: 'Track B',
          kind: 'TRACK',
          positions: [
            { time: '2024-06-15T10:00:00Z' },
            { time: '2024-06-15T10:05:00Z' },
            { time: '2024-06-15T10:10:00Z' },
          ],
        },
      },
    ],
    params: {},
  });

  // `uv run python -m debrief_calc.cli` reads JSON from stdin, writes
  // the MCP response JSON to stdout.  Stderr contains schema-validation
  // warnings we don't care about for this test.
  const stdout = execSync(
    'uv run python -m debrief_calc.cli',
    {
      cwd: `${__dirname}/../../../..`,
      input,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000,
    },
  );

  // The stdout may contain warnings ahead of the JSON payload; extract
  // the final line (the JSON response).
  const lines = stdout.trim().split('\n');
  return lines[lines.length - 1] ?? '';
}

describe('parseMcpResponseForTest — dataset artifact routing (Feature 178)', () => {
  // Allow 2 minutes because the first `uv run` invocation can resolve
  // the environment.
  const jsonResponse = (() => {
    try {
      return runPythonRangeBearing();
    } catch (err) {
      return `__ERROR__:${err instanceof Error ? err.message : String(err)}`;
    }
  })();

  it('real Python range-bearing output emits a dataset artifact content item', () => {
    expect(jsonResponse.startsWith('__ERROR__')).toBe(false);
    const parsed = JSON.parse(jsonResponse) as {
      content: Array<{
        annotations?: Record<string, unknown>;
        type?: string;
        resource?: { text?: string };
      }>;
    };
    expect(parsed.content).toHaveLength(1);
    const item = parsed.content[0]!;
    // Assert the Python side is still emitting the shape my fix targets.
    expect(item.annotations?.['debrief:resultType']).toBe(
      'artifact/dataset/range_bearing_series',
    );
    expect(typeof item.annotations?.['debrief:href']).toBe('string');
    expect(item.type).toBe('resource');
    expect(item.resource?.text).toBeTruthy();
  });

  it('parseMcpResponseForTest routes the dataset artifact into features (NOT artifactData) — user-reported bug', () => {
    const result = parseMcpResponseForTest(jsonResponse);

    // THE KEY ASSERTION — the carrier must land in `features.features`,
    // NOT in `artifactData`.
    expect(result.features.features).toHaveLength(1);

    // And `artifactData` / `artifactHref` must be undefined so the
    // downstream executeTool path doesn't auto-persist to STAC.
    expect(result.artifactData).toBeUndefined();
    expect(result.artifactHref).toBeUndefined();
  });

  it('the routed feature is a dataset carrier with __datasets in its properties', () => {
    const result = parseMcpResponseForTest(jsonResponse);
    const carrier = result.features.features[0]!;
    const props = carrier.properties as Record<string, unknown>;

    expect(props).toBeDefined();
    expect(props['__datasets']).toBeDefined();
    const datasets = props['__datasets'] as Array<Record<string, unknown>>;
    expect(Array.isArray(datasets)).toBe(true);
    expect(datasets).toHaveLength(2); // range + bearing

    // Verify both envelopes have the `range_bearing_series` type that
    // the ChartRenderer transformer is registered for.
    for (const ds of datasets) {
      expect(ds['type']).toBe('range_bearing_series');
      expect(ds['series']).toBeDefined();
      expect(Array.isArray(ds['series'])).toBe(true);
    }
  });

  it('the resultType is preserved on the result so downstream code can detect the dataset path', () => {
    const result = parseMcpResponseForTest(jsonResponse);
    expect(result.resultType).toBe('artifact/dataset/range_bearing_series');
  });
});
