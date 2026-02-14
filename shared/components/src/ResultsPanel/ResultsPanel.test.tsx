/**
 * Unit tests for ResultsPanel component.
 *
 * Feature: 095-results-bottom-panel
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ResultsPanel } from './ResultsPanel';
import type { ResultTab, TabContentPayload } from './types';

// Mock ChartRenderer since it uses vega-embed which needs a DOM canvas
vi.mock('../ChartRenderer', () => ({
  ChartRenderer: ({ spec }: { spec: object | null }) => (
    <div data-testid="mock-chart-renderer">
      {spec ? 'Chart rendered' : 'No spec'}
    </div>
  ),
}));

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

const datasetContent: TabContentPayload = {
  artifactType: 'dataset',
  spec: { $schema: 'https://vega.github.io/schema/vega-lite/v5.json', mark: 'bar', data: { values: [] } },
};

const imageContent: TabContentPayload = {
  artifactType: 'image',
  dataUri: 'data:image/png;base64,iVBOR',
};

const otherContent: TabContentPayload = {
  artifactType: 'other',
  filename: 'report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
};

const errorContent: TabContentPayload = {
  artifactType: 'dataset',
  spec: null,
  error: 'Invalid JSON: unexpected token',
};

describe('ResultsPanel', () => {
  describe('empty state', () => {
    it('renders empty state when no tabs', () => {
      render(<ResultsPanel tabs={[]} activeTabId={null} />);
      expect(screen.getByTestId('results-panel-empty')).toBeInTheDocument();
      expect(screen.getByText(/no results to display/i)).toBeInTheDocument();
    });
  });

  describe('single tab', () => {
    it('renders a dataset tab with chart', () => {
      const tab = makeTab('t1', 'Zone Histogram', datasetContent);
      render(<ResultsPanel tabs={[tab]} activeTabId="t1" />);

      expect(screen.getByTestId('results-panel')).toBeInTheDocument();
      expect(screen.getByTestId('mock-chart-renderer')).toBeInTheDocument();
      expect(screen.getByText('Chart rendered')).toBeInTheDocument();
    });

    it('renders an image tab', () => {
      const tab = makeTab('t2', 'bearing-time.png', imageContent);
      render(<ResultsPanel tabs={[tab]} activeTabId="t2" />);

      expect(screen.getByTestId('results-tab-image')).toBeInTheDocument();
      const img = screen.getByAltText('Result artifact');
      expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBOR');
    });

    it('renders a fallback tab with file info', () => {
      const tab = makeTab('t3', 'report.pdf', otherContent);
      render(<ResultsPanel tabs={[tab]} activeTabId="t3" />);

      expect(screen.getByTestId('results-tab-fallback')).toBeInTheDocument();
      // "report.pdf" appears in both tab bar and fallback viewer
      expect(screen.getAllByText('report.pdf').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/application\/pdf/)).toBeInTheDocument();
    });

    it('renders error state for failed dataset', () => {
      const tab = makeTab('t4', 'bad-data', errorContent);
      render(<ResultsPanel tabs={[tab]} activeTabId="t4" />);

      expect(screen.getByTestId('results-tab-error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });
  });

  describe('multi-tab', () => {
    it('renders tab bar with multiple tabs', () => {
      const tabs = [
        makeTab('t1', 'Zone Histogram', datasetContent),
        makeTab('t2', 'bearing-time.png', imageContent),
        makeTab('t3', 'report.pdf', otherContent),
      ];
      render(<ResultsPanel tabs={tabs} activeTabId="t1" />);

      expect(screen.getByTestId('results-tab-bar')).toBeInTheDocument();
      expect(screen.getByText('Zone Histogram')).toBeInTheDocument();
      expect(screen.getByText('bearing-time.png')).toBeInTheDocument();
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('calls onSelectTab when a tab is clicked', () => {
      const onSelectTab = vi.fn();
      const tabs = [
        makeTab('t1', 'Zone Histogram', datasetContent),
        makeTab('t2', 'bearing-time.png', imageContent),
      ];
      render(
        <ResultsPanel
          tabs={tabs}
          activeTabId="t1"
          onSelectTab={onSelectTab}
        />
      );

      fireEvent.click(screen.getByText('bearing-time.png'));
      expect(onSelectTab).toHaveBeenCalledWith('t2');
    });

    it('calls onCloseTab when close button is clicked', () => {
      const onCloseTab = vi.fn();
      const tabs = [
        makeTab('t1', 'Zone Histogram', datasetContent),
        makeTab('t2', 'bearing-time.png', imageContent),
      ];
      render(
        <ResultsPanel
          tabs={tabs}
          activeTabId="t1"
          onCloseTab={onCloseTab}
        />
      );

      fireEvent.click(screen.getByTestId('results-tab-close-t1'));
      expect(onCloseTab).toHaveBeenCalledWith('t1');
    });
  });

  describe('live update', () => {
    it('renders updated content when tab content changes', () => {
      const tab1 = makeTab('t1', 'Zone Histogram', datasetContent);
      const { rerender } = render(
        <ResultsPanel tabs={[tab1]} activeTabId="t1" />
      );

      // Verify initial chart
      expect(screen.getByText('Chart rendered')).toBeInTheDocument();

      // Re-render with error content (simulating live update)
      const updatedTab = makeTab('t1', 'Zone Histogram', errorContent);
      rerender(<ResultsPanel tabs={[updatedTab]} activeTabId="t1" />);

      expect(screen.getByTestId('results-tab-error')).toBeInTheDocument();
    });
  });

  describe('plot prefix', () => {
    it('shows plot prefix when showPlotPrefix is true', () => {
      const tab = makeTab('t1', 'Zone Histogram', datasetContent, {
        showPlotPrefix: true,
        plotTitle: 'Plot Alpha',
      });
      render(<ResultsPanel tabs={[tab]} activeTabId="t1" />);

      expect(screen.getByText('Zone Histogram — Plot Alpha')).toBeInTheDocument();
    });

    it('hides plot prefix when showPlotPrefix is false', () => {
      const tab = makeTab('t1', 'Zone Histogram', datasetContent, {
        showPlotPrefix: false,
      });
      render(<ResultsPanel tabs={[tab]} activeTabId="t1" />);

      expect(screen.getByText('Zone Histogram')).toBeInTheDocument();
    });
  });

  describe('fallback open external', () => {
    it('calls onOpenExternal when Open in VS Code button is clicked', () => {
      const onOpenExternal = vi.fn();
      const tab = makeTab('t1', 'report.pdf', otherContent);
      render(
        <ResultsPanel
          tabs={[tab]}
          activeTabId="t1"
          onOpenExternal={onOpenExternal}
        />
      );

      fireEvent.click(screen.getByTestId('results-tab-fallback-open'));
      expect(onOpenExternal).toHaveBeenCalledWith('t1');
    });
  });
});
