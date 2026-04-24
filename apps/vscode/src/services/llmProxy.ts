/**
 * VS Code extension-host proxy for NL → CQL2 calls (#191 T033-T036).
 *
 * Bridges webview `nlGenerate` messages to the shared `providerCall` core,
 * owning the API-key cache and per-request AbortController map. Never exposes
 * the key to the webview.
 *
 * IMPLEMENTATION PENDING — scaffolded by T003, implemented in Phase 3.
 */

export {};
