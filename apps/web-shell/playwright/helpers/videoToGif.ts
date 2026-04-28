/**
 * Playwright video → GIF conversion helper (Feature 234, US5 — T070, T2A).
 *
 * Shells out to `ffmpeg` via `child_process.execFile` (no shell injection
 * surface) using the standard palettegen + paletteuse pipeline:
 *
 *   1. palettegen builds an optimised 256-colour palette from the input.
 *   2. paletteuse renders the GIF against that palette.
 *
 * Settings: 10 fps, max-width 960 px, palette pipeline. Produces a GIF
 * that fits the FR-042 budget (< 5 s, < 2 MB hard, 1.8 MB soft warning).
 *
 * Why ffmpeg as a system binary (NOT an npm dep): research R6 — proven
 * path from #217 T520 + #189 T048; Article IX requires a tracked
 * dependency note when a system binary is assumed. FR-045 surfaces the
 * assumption via `task verify:ffmpeg`.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export interface GifOptions {
  /** Frames per second to render (default 10). Higher → larger file. */
  readonly fps?: number;
  /** Max output width in pixels (default 960). Aspect ratio preserved. */
  readonly maxWidthPx?: number;
  /**
   * Soft warning threshold in bytes; helper logs a warning when the
   * produced GIF exceeds this size. Default 1.8 MB (10 % margin under
   * the 2 MB hard cap from FR-042 — gives runner-variance headroom).
   */
  readonly softWarnBytes?: number;
  /** Override the warning sink for unit tests. Defaults to console.warn. */
  readonly warn?: (message: string) => void;
}

export interface GifConversionResult {
  readonly outputPath: string;
  readonly sizeBytes: number;
  readonly durationSec: number;
}

const DEFAULT_FPS = 10;
const DEFAULT_MAX_WIDTH = 960;
const DEFAULT_SOFT_WARN_BYTES = 1.8 * 1024 * 1024;

/**
 * Convert a webm to a GIF using ffmpeg's palettegen/paletteuse recipe.
 * Returns the measured size and duration so callers can assert against
 * the FR-042 budget.
 *
 * Throws if ffmpeg / ffprobe are not on PATH (FR-045's `task verify:ffmpeg`
 * is intended to surface this earlier).
 */
export async function convertWebmToGif(
  input: string,
  output: string,
  opts: GifOptions = {},
): Promise<GifConversionResult> {
  const fps = opts.fps ?? DEFAULT_FPS;
  const maxWidth = opts.maxWidthPx ?? DEFAULT_MAX_WIDTH;
  const softWarn = opts.softWarnBytes ?? DEFAULT_SOFT_WARN_BYTES;
  const warn = opts.warn ?? ((m: string): void => console.warn(m));

  // ffmpeg single-pass palettegen + paletteuse via the split filter.
  // Equivalent to the two-pass recipe but avoids the temporary palette
  // file. `flags=lanczos` for smooth downscale; `dither=bayer` keeps
  // gradients crisp without bloating the file.
  const filter =
    `[0:v] fps=${fps},scale=${maxWidth}:-1:flags=lanczos,split [a][b];` +
    `[a] palettegen=stats_mode=diff [p];` +
    `[b][p] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;

  await execFileAsync('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'warning',
    '-i',
    input,
    '-filter_complex',
    filter,
    '-loop',
    '0',
    output,
  ]);

  const { size } = await stat(output);

  // Probe the output duration. ffprobe is part of the same package as
  // ffmpeg on every distribution we target.
  const { stdout: probeStdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    output,
  ]);
  const durationSec = Number.parseFloat(probeStdout.trim()) || 0;

  if (size > softWarn) {
    warn(
      `[videoToGif] GIF size ${size} bytes exceeds soft-warn threshold ${softWarn} bytes (file: ${output}). ` +
        'Consider dropping fps or shortening the scenario before the 2 MB hard cap.',
    );
  }

  return { outputPath: output, sizeBytes: size, durationSec };
}
