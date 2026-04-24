#!/usr/bin/env node
/**
 * serve.mjs — minimal Node http-server for the NL demo.
 *
 * Used by Playwright's webServer hook (CI/Claude Code) and by
 * `pnpm run serve` for local development. Pure stdlib — no network install
 * required, which is important for cloud sessions where `pnpm dlx serve`
 * cannot reach the registry.
 */

import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(__filename, "..", "..");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safePath(reqUrl) {
  const url = new URL(reqUrl, "http://localhost/");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  // Strip leading slash so `join` doesn't treat it as absolute.
  const trimmed = pathname.replace(/^\/+/, "");
  const candidate = normalize(join(ROOT, trimmed));
  if (!candidate.startsWith(ROOT)) return null;
  return candidate;
}

const server = createServer(async (req, res) => {
  try {
    const filePath = safePath(req.url ?? "/");
    if (!filePath || !existsSync(filePath)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
      return;
    }
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      const idx = join(filePath, "index.html");
      if (existsSync(idx)) {
        const body = await readFile(idx);
        res.writeHead(200, { "content-type": MIME[".html"] });
        res.end(body);
      } else {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("Not found");
      }
      return;
    }
    const body = await readFile(filePath);
    const mime = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`Server error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`[serve] http://localhost:${PORT} (root=${ROOT})`);
});
