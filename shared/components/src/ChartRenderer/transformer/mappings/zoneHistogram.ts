import type { TopLevelSpec } from 'vega-lite';
import type { DatasetEnvelope } from '../../types';

/**
 * Transform a zone_histogram dataset into a Vega-Lite bar chart spec.
 *
 * Expects `dataset.data` to be an array of `{ zone: string, count: number }`.
 */
export function zoneHistogram(dataset: DatasetEnvelope): TopLevelSpec {
  const { title, metadata, data } = dataset;
  const xLabel = metadata.xAxis.units
    ? `${metadata.xAxis.label} (${metadata.xAxis.units})`
    : metadata.xAxis.label;
  const yLabel = metadata.yAxis.units
    ? `${metadata.yAxis.label} (${metadata.yAxis.units})`
    : metadata.yAxis.label;

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title,
    width: 'container',
    height: 300,
    data: { values: data ?? [] },
    mark: { type: 'bar', tooltip: true },
    encoding: {
      x: {
        field: 'zone',
        type: metadata.xAxis.type,
        axis: { title: xLabel },
        sort: null, // Preserve original order
      },
      y: {
        field: 'count',
        type: metadata.yAxis.type,
        axis: { title: yLabel },
      },
    },
  };
}
