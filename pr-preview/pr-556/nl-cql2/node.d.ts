/**
 * Node-only entry point for the NL → CQL2 module (#191).
 *
 * Exports the HTTPS-using `providerCall` core. Browser consumers MUST
 * import from `@debrief/components` (the main barrel) instead — that path
 * deliberately omits `providerCall` so node types do not cascade into
 * browser bundles.
 *
 * Subpath wired through `package.json::exports["./nl-cql2-node"]`.
 */
export { providerCall } from './providerCall';
export type { ProviderCall, ProviderCallInput, ProviderCallOverrides, } from './providerCall';
//# sourceMappingURL=node.d.ts.map