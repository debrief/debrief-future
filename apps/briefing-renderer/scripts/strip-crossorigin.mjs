// Post-build helper — strip the `crossorigin` attribute Vite emits on
// `<script>` and `<link rel="stylesheet">` tags inside dist/index.html.
//
// The briefing renderer is loaded from a file:// origin where CORS
// applies but cannot ever succeed (file:// has no origin to grant).
// The crossorigin attribute triggers a CORS check that blocks asset
// loads in current Chrome and Edge. Stripping it makes the loader fall
// back to the no-CORS path, which is what we want for a fully-local SPA.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
const distHtml = resolve(here, '../../dist/index.html');

const before = readFileSync(distHtml, 'utf8');
const after = before
  .replace(/<script\b([^>]*?)\scrossorigin(=("[^"]*"|'[^']*'))?/g, '<script$1')
  .replace(/<link\b([^>]*?)\scrossorigin(=("[^"]*"|'[^']*'))?/g, '<link$1');

if (after !== before) {
  writeFileSync(distHtml, after, 'utf8');
  console.log(`[strip-crossorigin] cleaned ${distHtml}`);
} else {
  console.log(`[strip-crossorigin] no changes needed`);
}
