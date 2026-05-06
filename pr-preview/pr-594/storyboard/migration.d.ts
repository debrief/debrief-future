import { Plot } from './types';

export type MigrationFn = (plot: Plot) => Plot;
export declare const V1_MIGRATIONS: ReadonlyMap<number, MigrationFn>;
export declare function runPlotOpenMigrations(plot: Plot, registry: ReadonlyMap<number, MigrationFn>): Plot;
//# sourceMappingURL=migration.d.ts.map