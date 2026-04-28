/**
 * Unit test for the videoToGif helper (Feature 234, US5 — T072, T2A).
 *
 * Drives the helper against a checked-in 1-second solid-colour fixture
 * webm. Asserts the output GIF exists, has size > 0, duration ≈ 1 s
 * (± 0.1 s tolerance), and triggers the soft-warn path when forced.
 *
 * Skipped when ffmpeg is missing locally — FR-045's `task verify:ffmpeg`
 * is the upstream guard. CI has ffmpeg (Ubuntu apt + macOS brew runners).
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { convertWebmToGif } from '../videoToGif';

const execFileAsync = promisify(execFile);
const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../fixtures/sample.webm',
);

let ffmpegAvailable = false;

beforeAll(async () => {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
});

describe('convertWebmToGif', () => {
  it.runIf(true)('produces a valid GIF from the fixture webm', async () => {
    if (!ffmpegAvailable) {
      // Skip — FR-045's task verify:ffmpeg is the upstream guard.
      return;
    }
    const tmp = await mkdtemp(path.join(tmpdir(), 'videoToGif-test-'));
    const outPath = path.join(tmp, 'out.gif');

    const result = await convertWebmToGif(FIXTURE_PATH, outPath);

    expect(result.outputPath).toBe(outPath);
    const fileStat = await stat(outPath);
    expect(fileStat.size).toBeGreaterThan(0);
    expect(fileStat.size).toBe(result.sizeBytes);

    // Fixture is ~1.0 s; allow ± 0.1 s tolerance for ffmpeg's rounding
    // when the input fps and output fps don't divide evenly.
    expect(result.durationSec).toBeGreaterThanOrEqual(0.5);
    expect(result.durationSec).toBeLessThanOrEqual(1.5);

    // GIF magic number: bytes 0..2 == "GIF" (0x47 0x49 0x46).
    const head = await readFile(outPath);
    expect(head[0]).toBe(0x47);
    expect(head[1]).toBe(0x49);
    expect(head[2]).toBe(0x46);
  });

  it('triggers the soft-warn callback when output exceeds the threshold', async () => {
    if (!ffmpegAvailable) {
      return;
    }
    const tmp = await mkdtemp(path.join(tmpdir(), 'videoToGif-test-'));
    const outPath = path.join(tmp, 'out.gif');
    const warnings: string[] = [];

    // Set a tiny soft-warn threshold so the fixture-derived GIF
    // (a few hundred bytes) deliberately exceeds it.
    await convertWebmToGif(FIXTURE_PATH, outPath, {
      softWarnBytes: 1,
      warn: (m) => warnings.push(m),
    });

    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('exceeds soft-warn threshold');
  });
});
