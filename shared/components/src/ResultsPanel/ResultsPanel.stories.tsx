/**
 * Storybook stories for ResultsPanel.
 *
 * Feature: 095-results-bottom-panel
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ResultsPanel } from './ResultsPanel';
import type { ResultTab, TabContentPayload } from './types';

const meta: Meta<typeof ResultsPanel> = {
  title: 'Components/ResultsPanel',
  component: ResultsPanel,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '300px', background: 'var(--vscode-panel-background, #1e1e1e)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResultsPanel>;

// ─── Helpers ──────────────────────────────────────────────────

const makeTab = (
  id: string,
  title: string,
  content: TabContentPayload,
  overrides: Partial<ResultTab> = {}
): ResultTab => ({
  id,
  title,
  plotTitle: 'Plot Alpha',
  artifactType: content.artifactType,
  content,
  showPlotPrefix: false,
  ...overrides,
});

const datasetSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  mark: 'bar',
  width: 'container',
  height: 200,
  data: {
    values: [
      { zone: 'A', count: 12 },
      { zone: 'B', count: 28 },
      { zone: 'C', count: 15 },
      { zone: 'D', count: 8 },
      { zone: 'E', count: 22 },
    ],
  },
  encoding: {
    x: { field: 'zone', type: 'nominal', title: 'Zone' },
    y: { field: 'count', type: 'quantitative', title: 'Count' },
  },
};

const datasetContent: TabContentPayload = {
  artifactType: 'dataset',
  spec: datasetSpec,
};

const imageContent: TabContentPayload = {
  artifactType: 'image',
  dataUri:
    'data:image/svg+xml;base64,' +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect fill="#2196F3" width="200" height="100"/><text x="50%" y="50%" fill="white" text-anchor="middle" dominant-baseline="middle">Sample Image</text></svg>'
    ),
};

const otherContent: TabContentPayload = {
  artifactType: 'other',
  filename: 'detailed-report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 245760,
};

const errorContent: TabContentPayload = {
  artifactType: 'dataset',
  spec: null,
  error: 'Invalid DatasetEnvelope: missing required field "metadata"',
};

// ─── Stories ──────────────────────────────────────────────────

export const EmptyState: Story = {
  args: {
    tabs: [],
    activeTabId: null,
  },
};

export const SingleDatasetTab: Story = {
  args: {
    tabs: [makeTab('zone-hist', 'Zone Histogram', datasetContent)],
    activeTabId: 'zone-hist',
  },
};

export const ImageTab: Story = {
  args: {
    tabs: [makeTab('bearing-img', 'Bearing Plot', imageContent)],
    activeTabId: 'bearing-img',
  },
};

export const FallbackTab: Story = {
  args: {
    tabs: [makeTab('report', 'detailed-report.pdf', otherContent)],
    activeTabId: 'report',
  },
};

export const ErrorTab: Story = {
  args: {
    tabs: [makeTab('bad-data', 'Invalid Dataset', errorContent)],
    activeTabId: 'bad-data',
  },
};

export const MultipleTabTypes: Story = {
  args: {
    tabs: [
      makeTab('zone-hist', 'Zone Histogram', datasetContent),
      makeTab('bearing-img', 'Bearing Plot', imageContent),
      makeTab('report', 'detailed-report.pdf', otherContent),
      makeTab('error', 'Failed Analysis', errorContent),
    ],
    activeTabId: 'zone-hist',
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: Array.from({ length: 10 }, (_, i) =>
      makeTab(
        `tab-${i}`,
        `Result ${i + 1} — Very Long Title That Should Truncate`,
        i % 2 === 0 ? datasetContent : imageContent
      )
    ),
    activeTabId: 'tab-0',
  },
};

export const WithPlotPrefix: Story = {
  args: {
    tabs: [
      makeTab('t1', 'Zone Histogram', datasetContent, {
        showPlotPrefix: true,
        plotTitle: 'Exercise Alpha',
      }),
      makeTab('t2', 'Range Bearing', datasetContent, {
        showPlotPrefix: true,
        plotTitle: 'Exercise Bravo',
      }),
    ],
    activeTabId: 't1',
  },
};
