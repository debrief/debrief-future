import { describe, it, expect } from 'vitest';
import { injectInlineData } from '../index';

const template = `<!doctype html>
<html lang="en">
  <body>
    <div id="briefing-root"></div>
    <script type="application/json" id="briefing-features-data"></script>
    <script type="application/json" id="briefing-item-data"></script>
    <script type="application/json" id="briefing-config"></script>
    <script type="module" src="./assets/index.js"></script>
  </body>
</html>`;

describe('injectInlineData', () => {
  it('fills all three slots with stringified JSON', () => {
    const result = injectInlineData(template, {
      features: { type: 'FeatureCollection', features: [] },
      item: { id: 'plot-1', title: 'A' },
      config: { tileLayerAttribution: 'X', maxBundledZoom: 8 },
    });
    expect(result.allSlotsFilled).toBe(true);
    expect(result.missingSlots).toEqual([]);
    expect(result.html).toContain('"FeatureCollection"');
    expect(result.html).toContain('"plot-1"');
    expect(result.html).toContain('"tileLayerAttribution"');
  });

  it('reports missing slots without throwing', () => {
    const stripped = template.replace(
      /<script type="application\/json" id="briefing-config"><\/script>/,
      '',
    );
    const result = injectInlineData(stripped, {
      features: {},
      item: {},
      config: {},
    });
    expect(result.allSlotsFilled).toBe(false);
    expect(result.missingSlots).toEqual(['briefing-config']);
  });

  it('escapes inline </script> to avoid breaking out of the JSON block', () => {
    const payload = { name: 'hack</script><script>evil</script>' };
    const result = injectInlineData(template, {
      features: payload,
      item: {},
      config: {},
    });
    // Find the features slot body — it should contain the escaped form
    // (with <) and no raw </script> closer inside.
    const slotMatch = result.html.match(
      /<script type="application\/json" id="briefing-features-data">([\s\S]*?)<\/script>/,
    );
    expect(slotMatch).not.toBeNull();
    const slotBody = slotMatch![1]!;
    expect(slotBody).not.toContain('</script>');
    expect(slotBody).toContain('\\u003c/script');
    // JSON.parse still reads the original string back.
    const parsed = JSON.parse(slotBody) as { name: string };
    expect(parsed.name).toBe('hack</script><script>evil</script>');
  });

  it('overwrites an existing slot body (idempotent re-export)', () => {
    const filled = injectInlineData(template, {
      features: { a: 1 },
      item: { b: 2 },
      config: { c: 3 },
    });
    const refilled = injectInlineData(filled.html, {
      features: { a: 99 },
      item: { b: 2 },
      config: { c: 3 },
    });
    expect(refilled.allSlotsFilled).toBe(true);
    expect(refilled.html).toContain('"a":99');
    expect(refilled.html).not.toContain('"a":1');
  });

  it('does not modify HTML outside the slot blocks', () => {
    const result = injectInlineData(template, {
      features: { f: 1 },
      item: { i: 1 },
      config: { c: 1 },
    });
    // The surrounding markup is preserved verbatim.
    expect(result.html).toContain('<div id="briefing-root"></div>');
    expect(result.html).toContain('<script type="module" src="./assets/index.js"></script>');
  });

  it('tolerates id-before-type attribute ordering', () => {
    const reordered = template.replace(
      'type="application/json" id="briefing-features-data"',
      'id="briefing-features-data" type="application/json"',
    );
    const result = injectInlineData(reordered, {
      features: { ok: true },
      item: {},
      config: {},
    });
    expect(result.missingSlots).not.toContain('briefing-features-data');
  });
});
