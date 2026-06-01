# E2E Summary: Overlap Warning for Time-Range Scenes

**Suite**: `shared/components/e2e/StoryboardOverlap.spec.ts`
**Runner**: Playwright via `@sparticuz/chromium` (cloud), `node run-playwright.mjs StoryboardOverlap`
**Story**: `Panels/StoryboardPanel` → `WithOverlapWarnings` (interactive — local dismissal state)

## Results

| Test | Result |
|------|--------|
| Both overlapping rows warn naming the partner; clean rows clean (light) | ✅ |
| Renders in dark theme | ✅ |
| Renders in vscode theme | ✅ |
| Dismiss clears the warning on both rows | ✅ |

**4 / 4 passed.**

## Theme-variant coverage

| Theme | Screenshot | Result |
|-------|------------|--------|
| light | `screenshots/overlap-light.png` | ✅ |
| dark | `screenshots/overlap-dark.png` | ✅ |
| vscode | `screenshots/overlap-vscode.png` | ✅ |

Plus `screenshots/overlap-after-dismiss.png` — the post-dismiss frame (paired with
`overlap-light.png` as a before/after, standing in for an interaction GIF;
`ffmpeg` is unavailable in this environment).

## What the E2E proves

- The warning is **perceivable and named** — assertions read the badge's
  `aria-label` ("Overlaps with Egress leg" / "Overlaps with Approach run"), so the
  warning is conveyed to assistive technology, not by colour alone (FR-012).
- Clean rows (non-overlapping time-range Scene + instant Scene) carry **no badge**
  (`toHaveCount(0)`), confirming zero false warnings (SC-002).
- **Dismiss** removes the badge from both rows in the live story, mirroring the
  host behaviour validated by the VS Code unit tests (FR-008).
</content>
