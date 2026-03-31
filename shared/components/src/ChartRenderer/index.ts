// ChartRenderer module — public API
export { ChartRenderer } from './ChartRenderer';
export type { ChartRendererProps, ChartRendererHandle } from './ChartRenderer';
export { VIEWPORT_SIGNAL_PREFIXES } from './viewportConstants';
export { transformDataset, registerTransformer, getSupportedTypes } from './transformer';
export type {
  DatasetEnvelope,
  DatasetMetadata,
  AxisDefinition,
  DataSeries,
} from './types';
export type {
  TransformerError,
  TransformResult,
} from './transformer/types';
