/**
 * injectInlineData — pure helper. Takes the briefing-renderer's bundled
 * `index.html` template and the three JSON payloads (features, item,
 * config) and produces a new HTML string with the payloads written
 * into their `<script type="application/json" id="briefing-...-data">`
 * slots.
 *
 * Per data-model § 4, the SPA template emits three empty
 * `<script type="application/json" id="briefing-{features,item,config}-data">`
 * blocks. We replace each block's body with `JSON.stringify(payload)`.
 *
 * Pure — never touches the network or filesystem.
 */

export interface InjectableInlineData {
  features: unknown;
  item: unknown;
  config: unknown;
}

export interface InjectionResult {
  html: string;
  /** True if every slot was found and filled. */
  allSlotsFilled: boolean;
  /** Slot ids that were not found in the template. */
  missingSlots: string[];
}

const SLOT_IDS = {
  features: 'briefing-features-data',
  item: 'briefing-item-data',
  config: 'briefing-config',
} as const;

/**
 * Encode the JSON so that no closing `</script>` sequence can appear in
 * the embedded payload. The HTML parser is in CDATA mode inside a
 * `<script type="application/json">` block but it still ends the block
 * on `</script` — so we escape the `<` to a Unicode escape that survives
 * `JSON.parse`.
 */
function safeJsonForScriptBlock(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function replaceSlot(html: string, id: string, jsonBody: string): { html: string; found: boolean } {
  // Match `<script type="application/json" id="X">…</script>`. The
  // template emits the opening tag with the id attribute either before
  // or after the type attribute; tolerate both orderings.
  //
  // We also tolerate any existing body so the same helper works on a
  // fresh template (empty body) and on a re-export of a previously
  // filled template.
  const pattern = new RegExp(
    `(<script\\b[^>]*?\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</script>)`,
    'i',
  );
  if (!pattern.test(html)) {
    return { html, found: false };
  }
  return {
    html: html.replace(pattern, `$1${jsonBody}$3`),
    found: true,
  };
}

export function injectInlineData(
  templateHtml: string,
  data: InjectableInlineData,
): InjectionResult {
  let html = templateHtml;
  const missing: string[] = [];

  const stages: Array<[keyof InjectableInlineData, string]> = [
    ['features', SLOT_IDS.features],
    ['item', SLOT_IDS.item],
    ['config', SLOT_IDS.config],
  ];

  for (const [key, id] of stages) {
    const json = safeJsonForScriptBlock(data[key]);
    const { html: nextHtml, found } = replaceSlot(html, id, json);
    html = nextHtml;
    if (!found) {
      missing.push(id);
    }
  }

  return {
    html,
    allSlotsFilled: missing.length === 0,
    missingSlots: missing,
  };
}
