import { EnumBundle } from './types';

/**
 * Resolve the enum-bundle path relative to `DEBRIEF_REPO_ROOT`. Callers in
 * tests get this env var via `vitest.globalSetup.ts`; at runtime (harness,
 * recorder script) the var must be set explicitly.
 */
export declare function enumBundlePath(): string;
export declare function loadEnumBundle(): EnumBundle;
//# sourceMappingURL=loadEnumBundle.d.ts.map