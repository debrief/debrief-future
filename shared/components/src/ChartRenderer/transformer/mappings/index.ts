import type { TransformerRegistry } from '../registry';
import { zoneHistogram } from './zoneHistogram';
import { rangeBearingSeries } from './rangeBearingSeries';

/** Register all built-in dataset type mappings. */
export function registerBuiltinMappings(registry: TransformerRegistry): void {
  registry.register('zone_histogram', zoneHistogram);
  registry.register('range_bearing_series', rangeBearingSeries);
}
