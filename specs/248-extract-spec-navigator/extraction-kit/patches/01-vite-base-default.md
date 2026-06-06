# Patch 01 — Flip Vite `base` default

## What

Change the default value of Vite's `base` option from `/debrief-future/spec-navigator/` (the in-monorepo path that GitHub Pages used while the app lived in `debrief-future`) to `/spec-navigator/` (the standalone-repo path).

## Why

The new repo deploys to `https://debrief.github.io/spec-navigator/`, not to `https://debrief.github.io/debrief-future/spec-navigator/`. With the old default, every asset fetch would 404 because the bundle would assume the `/debrief-future/` prefix is part of the URL.

`VITE_BASE` env-var override is preserved, so an adopter hosting at a different path doesn't have to fork — they just set the variable.

## How

Edit `vite.config.ts` (top of the extracted source tree). Locate:

```ts
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/debrief-future/spec-navigator/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

Change to:

```ts
export default defineConfig({
  base: process.env.VITE_BASE ?? process.env.VITE_BASE_URL ?? '/spec-navigator/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

(Both env-var names are accepted for one release cycle so any forked CI scripts that still set `VITE_BASE_URL` keep working. The new canonical name is `VITE_BASE`, matching `deploy.yml` in this kit.)

## Verify

```sh
pnpm build
grep -E '/spec-navigator/' dist/index.html
```

The built `index.html` should reference `/spec-navigator/assets/…`, not `/debrief-future/spec-navigator/assets/…`.

## Commit message

```
build: flip Vite base default to /spec-navigator/

Standalone repo hosts at /spec-navigator/ on GitHub Pages, not at
/debrief-future/spec-navigator/. VITE_BASE override preserved for
adopters hosting under a different path.
```
