#!/usr/bin/env node
/**
 * sync-data.mjs — copy the catalog + fixture corpus + platform registry into
 * apps/nl-demo/data/, and bundle the small subset of @debrief/components the
 * demo consumes (`nl-cql2` + `filter-engine`) into a single browser-ready ESM
 * file at apps/nl-demo/data/debrief-lib.js.
 *
 * The data sync is the only "build step" anywhere near the demo; running this
 * script once after a checkout is enough to make `pnpm serve` work end-to-end.
 * The demo's own .jsx files are still transformed at runtime by Babel (per
 * FR-001: no build step for demo-specific code).
 */

import { build } from "esbuild";
import { mkdir, copyFile, readdir, rm, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEMO_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(DEMO_ROOT, "..", "..");

const SAMPLE_STORE = resolve(REPO_ROOT, "preview/workspace/samples/local-store");
const FIXTURE_RESPONSES = resolve(
  REPO_ROOT,
  "shared/components/src/nl-cql2/__tests__/fixtures/responses.json",
);
const FIXTURE_CORPUS = resolve(
  REPO_ROOT,
  "shared/components/src/nl-cql2/__tests__/fixtures/corpus.json",
);
const PLATFORM_REGISTRY = resolve(REPO_ROOT, "shared/data/platform-registry.json");
const ENUM_BUNDLE = resolve(REPO_ROOT, "shared/data/enum-bundle.json");

const DATA_DIR = resolve(DEMO_ROOT, "data");
const ITEMS_DIR = resolve(DATA_DIR, "items");

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function copyCatalog() {
  if (!existsSync(SAMPLE_STORE)) {
    throw new Error(`sample catalog not found: ${SAMPLE_STORE}`);
  }
  await ensureDir(DATA_DIR);
  await ensureDir(ITEMS_DIR);

  // Copy catalog.json
  await copyFile(join(SAMPLE_STORE, "catalog.json"), join(DATA_DIR, "catalog.json"));

  // Copy each item.json into data/items/<id>.json
  const entries = await readdir(SAMPLE_STORE, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const itemPath = join(SAMPLE_STORE, entry.name, "item.json");
    if (!existsSync(itemPath)) continue;
    const dest = join(ITEMS_DIR, `${entry.name}.json`);
    await copyFile(itemPath, dest);
    count++;
  }
  console.log(`[sync-data] copied ${count} item.json files into data/items/`);
}

async function copyFixtures() {
  if (!existsSync(FIXTURE_RESPONSES)) {
    throw new Error(`fixture corpus not found: ${FIXTURE_RESPONSES}`);
  }
  if (!existsSync(FIXTURE_CORPUS)) {
    throw new Error(`fixture corpus.json not found: ${FIXTURE_CORPUS}`);
  }
  await copyFile(FIXTURE_RESPONSES, join(DATA_DIR, "responses.json"));
  await copyFile(FIXTURE_CORPUS, join(DATA_DIR, "corpus.json"));
  console.log("[sync-data] copied responses.json + corpus.json");
}

async function copyRegistries() {
  await copyFile(PLATFORM_REGISTRY, join(DATA_DIR, "platform-registry.json"));
  await copyFile(ENUM_BUNDLE, join(DATA_DIR, "enum-bundle.json"));
  console.log("[sync-data] copied platform-registry.json + enum-bundle.json");
}

async function bundleLibrary() {
  const entry = resolve(DEMO_ROOT, "scripts/lib-entry.mjs");
  const out = resolve(DATA_DIR, "debrief-lib.js");

  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    format: "esm",
    target: ["es2022"],
    platform: "browser",
    minify: false,
    sourcemap: false,
    logLevel: "warning",
    // Use the workspace TypeScript directly so we don't depend on a built
    // dist/ tree existing for @debrief/components.
    resolveExtensions: [".ts", ".tsx", ".mjs", ".js"],
    loader: { ".ts": "ts", ".tsx": "tsx" },
  });

  const stats = await stat(out);
  console.log(`[sync-data] bundled debrief-lib.js (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function vendorRuntime() {
  const VENDOR_DIR = resolve(DATA_DIR, "vendor");
  await ensureDir(VENDOR_DIR);

  // Bundle React + ReactDOM together so they share a single React instance.
  // The importmap in index.html maps both `react` and `react-dom/client` to
  // this same file.
  const runtimeEntry = resolve(DEMO_ROOT, "scripts/runtime-entry.mjs");
  await build({
    entryPoints: [runtimeEntry],
    outfile: resolve(VENDOR_DIR, "runtime.js"),
    bundle: true,
    format: "esm",
    target: ["es2022"],
    platform: "browser",
    minify: true,
    sourcemap: false,
    logLevel: "warning",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  });

  // Babel-standalone: copy the prebuilt UMD bundle from node_modules.
  const babelSrc = resolve(
    REPO_ROOT,
    "node_modules/@babel/standalone/babel.min.js",
  );
  const babelAlt = resolve(
    DEMO_ROOT,
    "node_modules/@babel/standalone/babel.min.js",
  );
  const src = existsSync(babelSrc) ? babelSrc : babelAlt;
  if (!existsSync(src)) {
    throw new Error(
      `babel-standalone not found in node_modules — run pnpm install first`,
    );
  }
  await copyFile(src, resolve(VENDOR_DIR, "babel.min.js"));
  console.log("[sync-data] vendored react + react-dom + babel-standalone");
}

async function main() {
  console.log("[sync-data] starting from repo root:", REPO_ROOT);
  await ensureDir(DATA_DIR);

  await copyCatalog();
  await copyFixtures();
  await copyRegistries();
  await bundleLibrary();
  await vendorRuntime();

  console.log("[sync-data] complete.");
}

main().catch((err) => {
  console.error("[sync-data] FAILED:", err.message);
  process.exitCode = 1;
});
