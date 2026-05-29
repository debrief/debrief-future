/**
 * ChartRenderer types.
 *
 * The canonical definitions for AxisDefinition, DatasetMetadata, DataSeries,
 * and DatasetEnvelope live in @debrief/utils so both the component library
 * and service-side code (VS Code host, web-shell mocks) can reference them
 * without a cycle through @debrief/components. This module re-exports those
 * types for backward compatibility with existing component imports.
 */
export type { AxisDefinition, DatasetMetadata, DataSeries, DatasetEnvelope, } from '@debrief/utils';
//# sourceMappingURL=types.d.ts.map