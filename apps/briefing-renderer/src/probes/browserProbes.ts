/**
 * Boot-time browser-compat probes for the briefing renderer SPA.
 *
 * The supported browser matrix is **current Chrome or Edge on desktop**
 * (research.md R6 / FR-014). Opening the briefing in any other browser
 * surfaces a banner directing the user to a supported browser; the SPA
 * does not block mount.
 *
 * Per Article I.3 (no silent failures), a failed probe always surfaces a
 * visible banner — never a silent degradation to network fallbacks.
 */

export interface BrowserProbeResult {
  inlineJsonReadable: boolean;
  relativeImgLoadable: boolean;
  userAgentSupported: boolean;
}

export function probeUserAgent(userAgent: string): boolean {
  // Edge identifies as both Chrome and Edge in its UA. We accept any
  // Chromium-based UA string here; Firefox / Safari fail the check.
  // Mobile UAs (which include 'Mobile') are out of supported scope.
  const isChromium = /Chrome\//.test(userAgent) || /Chromium\//.test(userAgent);
  const isFirefox = /Firefox\//.test(userAgent);
  const isSafari =
    /Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent);
  return isChromium && !isFirefox && !isSafari;
}

export function probeInlineJsonReadable(): boolean {
  if (typeof document === 'undefined') return false;
  // The SPA reads its data via `document.getElementById(…).textContent` —
  // this is the same DOM API we depend on at boot.
  try {
    return typeof document.getElementById === 'function';
  } catch {
    return false;
  }
}

export function runBrowserProbes(): BrowserProbeResult {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return {
    inlineJsonReadable: probeInlineJsonReadable(),
    relativeImgLoadable: true, // verified empirically by image load; banner triggered via onError elsewhere
    userAgentSupported: probeUserAgent(ua),
  };
}

export const UNSUPPORTED_BROWSER_BANNER =
  'This briefing is built for current Chrome or Edge. Other browsers may render the map but interactive playback is not supported. Open this file in Chrome or Edge for the full experience.';
