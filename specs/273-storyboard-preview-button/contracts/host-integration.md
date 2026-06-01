# Contract: Host integration (panel control, VS Code server, web-shell handoff, shared export)

**Feature**: 273

## A. Shared header Preview control (`shared/components/.../StoryboardPanel`)

- Adds `onPreview?: () => void` and `canPreview?: boolean` to `StoryboardHeaderProps`/`StoryboardPanelProps`.
- **C-A1**: Preview button renders in the header button row (sibling of Capture) iff `typeof onPreview === 'function'`.
- **C-A2**: When `canPreview === false` (no active storyboard or zero scenes), the button is disabled with an explanatory tooltip (FR-007); it does not fire `onPreview`.
- **C-A3**: A consumer that passes no `onPreview` (legacy) renders identically to today — no Preview button, no layout shift regression.
- **C-A4**: Clicking an enabled Preview button calls `onPreview()` exactly once.

## B. VS Code preview launch

- **C-B1**: Webview posts `{ type: 'preview-clicked' }`; `storyboardPanelView` routes it to the preview command.
- **C-B2**: The command scopes the **active** storyboard's features (via shared `scopeStoryboard`) and makes them available at `/features.geojson` on a loopback HTTP server.
- **C-B3**: The server also serves the bundled renderer (`resources/briefing-renderer-static/`) at `/`.
- **C-B4**: The extension opens the system browser at `await asExternalUri(http://127.0.0.1:<port>/?features=features.geojson)` via `openExternal`. The `features` value is **relative** so it resolves against the renderer's document URL and survives a proxy path-prefix (e.g. code-server's `/proxy/<port>/`); an absolute `/features.geojson` would escape that prefix.
- **C-B5**: Works with no external network (loopback only). Server is reused across previews and disposed on deactivation.
- **C-B6**: If the active storyboard has no scenes, the command does not launch and the UI explains why (mirrors `canPreview`).
- **C-B7**: The server binds `127.0.0.1` only and enforces a **`Host` header allowlist**. Requests whose `Host` is a loopback name (`127.0.0.1`/`localhost`/`[::1]`, any port) are served; foreign hosts are rejected with `403`. This defeats DNS-rebinding, where a malicious page resolves an attacker-controlled domain to `127.0.0.1` to reach the loopback server from its own browser origin. (Loopback binding alone blocks remote network access but not rebinding, which arrives as an ordinary local request carrying a foreign `Host`.) **Tunnel exception:** under a Remote/Codespaces/code-server tunnel, `asExternalUri` rewrites the loopback to a public host that the proxy forwards here as a foreign `Host`; the extension registers that exact host (`trustExternalHost`) so it is additionally accepted. This is safe because in a tunnel the server is bound to the *remote* host's loopback, reachable only via the authenticated tunnel — rebinding cannot reach it. Without this, the proxied request is `403 Forbidden` (the reported Heroku/code-server bug).

## C. Web-shell preview launch

- **C-C1**: `onPreview` scopes the active storyboard's features from the in-memory `featureCollection`, builds a `Blob`, and creates an object URL.
- **C-C2**: Opens a new tab at `<renderer base>/?features=<encodeURIComponent(blobUrl)>` (same origin); the web-shell tab stays alive so the blob remains fetchable.
- **C-C3**: The briefing-renderer dist is reachable under web-shell's served tree at `/briefing-renderer/` in dev, `vite preview`, and the static build.
- **C-C4**: If the browser blocks the new tab, web-shell surfaces the reason (FR-009).

## D. Shared export package `@debrief/briefing-export`

- **C-D1**: Exposes the pure orchestrator + `ExportDeps` interface; pure core has no Node `fs`/`path`/`os` imports.
- **C-D2**: VS Code adapter and web-shell adapter both implement `ExportDeps`; the resulting zip is functionally equivalent for the same storyboard (FR-015) — verified by comparing in-memory `assembleZip` output given equivalent inputs.
- **C-D3**: Web-shell export delivers the zip as a browser download; VS Code export writes to disk via save dialog (unchanged).
- **C-D4**: Web-shell reads `item.json` and scene-thumbnail assets through the `@debrief/stac-writer` abstraction — never raw IndexedDB (Article IV.4).
- **C-D5**: No new external dependency is added (JSZip already present).

## E. Cross-cutting

- **C-E1**: Preview and Export always act on the storyboard currently active in the panel (FR-017).
- **C-E2**: Preview is read-only — no writes, no provenance entry.
