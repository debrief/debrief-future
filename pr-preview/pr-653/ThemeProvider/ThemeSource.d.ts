import { ThemeVariant } from './ThemeContext';

/**
 * The four explicit theme variants. `'system'` is excluded — sources always
 * resolve to a concrete variant before reaching consumers.
 */
export type ResolvedVariant = Exclude<ThemeVariant, 'system'>;
export interface ThemeSource {
    /** Synchronous read for first paint. Must not throw. */
    read(): ResolvedVariant;
    /**
     * Subscribe to live updates.
     * @param onChange called every time the variant changes; never called
     *                 with the same value back-to-back (de-duped by the source).
     * @returns cleanup function. Idempotent; safe to call multiple times.
     */
    subscribe(onChange: (variant: ResolvedVariant) => void): () => void;
}
//# sourceMappingURL=ThemeSource.d.ts.map