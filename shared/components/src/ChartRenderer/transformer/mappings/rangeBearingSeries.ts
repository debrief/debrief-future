import type { TopLevelSpec } from 'vega-lite';
import type { DatasetEnvelope } from '../../types';

/**
 * Transform a range_bearing_series dataset into a Vega-Lite line chart spec.
 *
 * Expects `dataset.series` to be an array of `{ name, data: [{ time, value }] }`.
 * Each series becomes a separate coloured line with a legend entry.
 */
export function rangeBearingSeries(dataset: DatasetEnvelope): TopLevelSpec {
  const { title, metadata, series } = dataset;
  const xLabel = metadata.xAxis.units
    ? `${metadata.xAxis.label} (${metadata.xAxis.units})`
    : metadata.xAxis.label;
  const yLabel = metadata.yAxis.units
    ? `${metadata.yAxis.label} (${metadata.yAxis.units})`
    : metadata.yAxis.label;

  // Flatten series into a single values array with a "series" discriminator.
  const values = (series ?? []).flatMap((s) =>
    s.data.map((d) => ({ ...d, series: s.name })),
  );

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title,
    width: 'container',
    height: 300,
    data: { values },
    mark: { type: 'line', tooltip: true, point: true },
    encoding: {
      x: {
        field: 'time',
        type: metadata.xAxis.type,
        axis: { title: xLabel },
      },
      y: {
        field: 'value',
        type: metadata.yAxis.type,
        axis: { title: yLabel },
      },
      color: {
        field: 'series',
        type: 'nominal',
        legend: { title: 'Series' },
      },
    },
  };
}
