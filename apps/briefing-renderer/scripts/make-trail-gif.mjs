/**
 * Assemble the #280 trail-growth interaction GIF from the PNG frames the
 * `briefing-zip-trail-gif` Playwright spec writes to /tmp.
 *
 * Evidence-only tooling: uses `sharp` (already in the monorepo) to decode +
 * downscale each frame and `gifenc` (installed on demand, NOT a repo
 * dependency) to encode an animated GIF. Output:
 *   specs/280-briefing-trail-mode/evidence/screenshots/interaction.gif
 *
 * Usage (paths are resolved relative to this script):
 *   SHARP=<path> GIFENC=<path> node scripts/make-trail-gif.mjs
 */

import { readdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const sharp = require(process.env.SHARP);
const { GIFEncoder, quantize, applyPalette } = require(process.env.GIFENC);

const framesDir = '/tmp/trail-gif-frames';
const outPath = resolve(
  __dirname,
  '../../../specs/280-briefing-trail-mode/evidence/screenshots/interaction.gif',
);

const WIDTH = 480; // downscaled for size (< 2 MB target)
const DELAY = 200; // ms per frame → 14 frames ≈ 2.8 s

const files = readdirSync(framesDir)
  .filter((f) => f.startsWith('frame-') && f.endsWith('.png'))
  .sort();

if (files.length === 0) {
  throw new Error(`no frames found in ${framesDir}`);
}

const gif = GIFEncoder();
let dims = null;

for (const file of files) {
  const { data, info } = await sharp(resolve(framesDir, file))
    .resize({ width: WIDTH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  dims = { width: info.width, height: info.height };
  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const palette = quantize(rgba, 256, { format: 'rgb565' });
  const index = applyPalette(rgba, palette, 'rgb565');
  gif.writeFrame(index, info.width, info.height, { palette, delay: DELAY });
}

gif.finish();
const bytes = gif.bytes();
writeFileSync(outPath, bytes);

const kb = (bytes.length / 1024).toFixed(0);
console.log(
  `wrote ${outPath} — ${files.length} frames @ ${dims.width}x${dims.height}, ${kb} KB`,
);
