# Screenshot Evidence — #198 Keyring-Unavailable Banner

This directory holds the visual evidence for the four banner variants
introduced by this feature, plus the regression-proof and recovery
captures listed below.

## Captures

| File | Source | What it shows |
|------|--------|---------------|
| `banner-keyring-unavailable-linux.png` | Storybook E2E `FilterBar-nl.spec.ts::renders linux variant` | Linux variant — "Unlock your gnome-keyring or KWallet" hint visible. |
| `banner-keyring-unavailable-macos.png` | Storybook E2E (macOS variant test) | macOS variant — "Unlock Keychain Access" hint. |
| `banner-keyring-unavailable-windows.png` | Storybook E2E (Windows variant test) | Windows variant — "Check Credential Manager service" hint. |
| `banner-keyring-unavailable-linux-dark.png` | Storybook E2E linux × dark theme | Same banner, dark theme. |
| `banner-keyring-unavailable-linux-vscode.png` | Storybook E2E linux × vscode theme | Same banner, VS Code theme. |
| `banner-not-configured-unchanged.png` | VS Code E2E T041 (skipped pending harness) | Regression proof — existing not-configured banner unchanged. |
| `recovery-after-unlock.gif` | VS Code E2E T042 trace (skipped pending harness) | < 5 s recovery animation: keyring-unavailable banner → unlock → second submission → chip applies. |
| `vscode-keyring-unavailable.png` | VS Code E2E T040 (skipped pending harness) | Real VS Code chrome screenshot. |

## Capture commands

Storybook (currently runnable — produces six of the PNGs above):

```sh
pnpm --filter @debrief/components build-storybook
pnpm --filter @debrief/components test:e2e FilterBar-nl
```

VS Code Webview E2E (skipped until #191's harness lands the
`secrets.get` rejection hook):

```sh
# Once unblocked:
node tests/e2e/scripts/run-vscode-nl-search.mjs
```

The remaining captures (`recovery-after-unlock.gif`,
`banner-not-configured-unchanged.png`, `vscode-keyring-unavailable.png`)
will be produced automatically by the same VS Code E2E runner once the
suite's `.skip` is removed.

## Why this README exists in evidence

The Storybook E2E tests in this branch produce these PNGs on every CI
run. They are intentionally NOT committed as binary blobs by hand — CI
runs them, re-captures, and the resulting PNGs land via `actions/
upload-artifact`. The PNGs are then attached to the published blog post
by the blog-publish workflow that picks them up from the artifact.

If you need to generate them locally:
- Run the Storybook E2E suite as documented above; PNGs land here.
- For the GIF, run the VS Code E2E suite with `recordVideo: { dir: …,
  size: { width: 1024, height: 768 } }` enabled in
  `playwright.config.ts`; the resulting `.webm` can be converted to GIF
  with `ffmpeg -i input.webm -filter:v "fps=15,scale=1024:-1" output.gif`
  (target < 5 s, < 2 MB per the Quality Rubric).
