/**
 * Feature 209 — Mini WCAG 2.1 AA audit runner.
 *
 * A sandbox-compatible subset audit that loads the LogPanel CSS + a static
 * HTML harness, applies the vsCodeTokenMap variant, and runs a handful of
 * hand-implemented WCAG checks against the rendered DOM.
 *
 * This is NOT a replacement for `@axe-core/playwright`. Its purpose is to
 * produce a real audit result in environments where npm packages cannot be
 * installed (e.g. Claude Code sandbox sessions with locked egress).
 *
 * Rules covered:
 *  - button-name (critical): every <button> has an accessible name.
 *  - html-has-lang (serious): document root carries a lang attribute.
 *  - region (moderate): page content sits inside a landmark.
 *  - aria-required-parent (serious): role="tab" under role="tablist".
 *  - color-contrast (serious): WCAG AA — 4.5:1 normal, 3:1 large text.
 *
 * Usage (from repo root):
 *   node specs/209-logpanel-a11y-audit/evidence/tools/mini-audit.cjs
 *
 * Requires the global Playwright install (node >=18) and the pre-installed
 * Chromium under /opt/pw-browsers (or any valid executablePath).
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const LOG_PANEL_CSS = fs.readFileSync(
  path.join(REPO, 'shared/components/src/LogPanel/LogPanel.css'),
  'utf8'
);

// Load vsCodeTokenMap by shelling out to a tsc compile into a temp dir and
// requiring the CJS output. Avoids a TS runtime dependency.
const tmpDir = fs.mkdtempSync('/tmp/mini-audit-');
const tscBin = '/opt/node22/lib/node_modules/typescript/bin/tsc';
const { execSync } = require('node:child_process');
execSync(
  `${tscBin} --target es2020 --module commonjs --esModuleInterop --outDir ${tmpDir} ` +
  path.join(REPO, 'shared/components/src/ThemeProvider/vsCodeTokenMap.ts'),
  { stdio: 'inherit' }
);
const { VS_CODE_TOKEN_MAP } = require(path.join(tmpDir, 'vsCodeTokenMap.js'));

function html(themeVars, themeLabel) {
  const cssVars = Object.entries(themeVars)
    .map(([k, v]) => `${k}: ${v};`)
    .join('\n  ');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>LogPanel — ${themeLabel}</title>
<style>
:root { ${cssVars} }
html, body { margin: 0; padding: 0; height: 100%; }
body { display: flex; flex-direction: column; height: 100vh; background: var(--vscode-editor-background); }
${LOG_PANEL_CSS}
</style></head>
<body>
<main>
<div class="log-panel" data-testid="log-panel" role="region" aria-label="Log panel">
  <div class="log-panel__action-bar" role="toolbar" aria-label="Log panel actions">
    <div class="log-panel__action-bar-actions">
      <button class="log-panel__action-btn" type="button">New</button>
      <button class="log-panel__action-btn" type="button">Tune</button>
      <button class="log-panel__action-btn" type="button" disabled>Restore</button>
    </div>
    <div class="log-panel__action-bar-toggles">
      <div class="log-panel__toggle-group" role="tablist" aria-label="View mode">
        <button class="log-panel__toggle-btn log-panel__toggle-btn--active" role="tab" aria-selected="true" type="button">Timeline</button>
        <button class="log-panel__toggle-btn" role="tab" aria-selected="false" type="button">By Feature</button>
        <button class="log-panel__toggle-btn" role="tab" aria-selected="false" type="button">Compact</button>
      </div>
    </div>
  </div>
  <div class="log-panel__filter-row">
    <button class="log-panel__filter-toggle" type="button" aria-expanded="false" aria-controls="log-panel-filters">▸ Filters</button>
  </div>
  <div class="log-panel__timeline" role="list">
    <div class="log-panel__entry log-panel__entry--selected" role="listitem" aria-selected="true" tabindex="0">
      <div class="log-panel__entry-header">
        <span class="log-panel__entry-step">5</span>
        <span class="log-panel__entry-tool">Range &amp; Bearing</span>
        <span class="log-panel__entry-feature">→ Track Alpha</span>
      </div>
      <div class="log-panel__entry-meta">
        <div class="log-panel__entry-badges"><span class="log-panel__track-badge">Alpha</span></div>
        <span class="log-panel__entry-timestamp">14:35:00</span>
      </div>
    </div>
    <div class="log-panel__entry" role="listitem" tabindex="-1">
      <div class="log-panel__entry-header">
        <span class="log-panel__entry-step">4</span>
        <span class="log-panel__entry-tool">Closest Approach</span>
      </div>
    </div>
  </div>
</div>
</main>
</body></html>`;
}

async function runMiniAudit(page) {
  return await page.evaluate(() => {
    const violations = [];
    document.querySelectorAll('button').forEach((btn) => {
      const text = btn.innerText.trim();
      const aria = btn.getAttribute('aria-label');
      if (!text && !aria) {
        violations.push({ rule: 'button-name', severity: 'critical',
          target: btn.outerHTML.slice(0, 200),
          desc: 'Button has no accessible name (text or aria-label)' });
      }
    });
    if (!document.documentElement.lang) {
      violations.push({ rule: 'html-has-lang', severity: 'serious',
        target: '<html>', desc: 'html element is missing lang attribute' });
    }
    const landmarks = document.querySelectorAll('main, [role="main"], [role="region"]');
    if (landmarks.length === 0) {
      violations.push({ rule: 'region', severity: 'moderate',
        target: 'document', desc: 'No landmarks found' });
    }
    document.querySelectorAll('[role="tab"]').forEach((tab) => {
      const parent = tab.closest('[role="tablist"]');
      if (!parent) {
        violations.push({ rule: 'aria-required-parent', severity: 'serious',
          target: tab.outerHTML.slice(0, 200),
          desc: 'role="tab" must have parent with role="tablist"' });
      }
    });
    function rgb(s) {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b] = m[1].split(',').map(n => parseInt(n));
      return { r, g, b };
    }
    function lum({r, g, b}) {
      const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
    }
    function ratio(a, b) {
      const l1 = Math.max(lum(a), lum(b));
      const l2 = Math.min(lum(a), lum(b));
      return (l1 + 0.05) / (l2 + 0.05);
    }
    document.querySelectorAll('.log-panel__entry-tool, .log-panel__entry-feature, .log-panel__action-btn, .log-panel__toggle-btn, .log-panel__filter-toggle, .log-panel__track-badge').forEach((el) => {
      const style = window.getComputedStyle(el);
      const fg = rgb(style.color);
      let bgEl = el;
      let bg = null;
      while (bgEl && !bg) {
        const s = window.getComputedStyle(bgEl);
        const b = rgb(s.backgroundColor);
        if (b && s.backgroundColor !== 'rgba(0, 0, 0, 0)') { bg = b; break; }
        bgEl = bgEl.parentElement;
      }
      if (!fg || !bg) return;
      const r = ratio(fg, bg);
      const fs = parseFloat(style.fontSize);
      const bold = parseInt(style.fontWeight) >= 700;
      const largeText = fs >= 18 || (fs >= 14 && bold);
      const threshold = largeText ? 3 : 4.5;
      if (r < threshold) {
        violations.push({ rule: 'color-contrast', severity: 'serious',
          target: el.outerHTML.slice(0, 120),
          desc: `Contrast ratio ${r.toFixed(2)} < ${threshold} (${largeText?'large':'normal'} text)` });
      }
    });
    return violations;
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const allViolations = [];
  const runs = [];
  for (const variant of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 420, height: 600 } });
    await page.setContent(html(VS_CODE_TOKEN_MAP[variant], variant));
    await page.waitForLoadState('domcontentloaded');
    const violations = await runMiniAudit(page);
    runs.push({ theme: variant, count: violations.length });
    for (const v of violations) allViolations.push({ ...v, theme: variant });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify({ runs, violations: allViolations }, null, 2));
  process.exit(allViolations.some(v => v.severity === 'critical' || v.severity === 'serious') ? 1 : 0);
})();
