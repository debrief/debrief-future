/**
 * ToolMatchHarness - Visual verification harness for tool matching.
 *
 * Shows a two-panel layout:
 * - Left: Feature list with checkboxes for selection
 * - Right: Tool list showing active/inactive tools
 */

import { useState, useMemo, CSSProperties } from 'react';
import { ToolMatchService } from '../ToolMatchService';
import { createSelectionFromCounts } from '../types';
import type { Tool } from '@debrief/schemas';
import type { SimpleFeature } from './fixtures/features';
import { getFeaturesByKind, getKindLabel } from './fixtures/features';
import './ToolMatchHarness.css';

export interface ToolMatchHarnessProps {
  /** Features to display in the selection panel */
  features: SimpleFeature[];
  /** Tools to match against the selection */
  tools: Tool[];
  /** Initial selected feature IDs */
  initialSelection?: string[];
  /** Whether to show inactive tools initially */
  initialShowInactive?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
}

/**
 * ToolMatchHarness displays a feature selection panel and tool matching results.
 *
 * @example
 * ```tsx
 * <ToolMatchHarness
 *   features={sampleFeatures}
 *   tools={sampleTools}
 * />
 * ```
 */
export function ToolMatchHarness({
  features,
  tools,
  initialSelection = [],
  initialShowInactive = false,
  className,
  style,
}: ToolMatchHarnessProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelection)
  );
  const [showInactive, setShowInactive] = useState(initialShowInactive);

  // Create the tool match service
  const service = useMemo(() => new ToolMatchService(tools), [tools]);

  // Calculate selection counts by kind
  const selection = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of selectedIds) {
      const feature = features.find((f) => f.id === id);
      if (feature) {
        counts[feature.kind] = (counts[feature.kind] ?? 0) + 1;
      }
    }
    return createSelectionFromCounts(counts);
  }, [selectedIds, features]);

  // Get match results
  const results = useMemo(
    () => service.getMatchResults(selection),
    [service, selection]
  );

  // Group features by kind
  const groupedFeatures = useMemo(() => getFeaturesByKind(), []);

  // Filter results based on showInactive toggle
  const visibleResults = useMemo(() => {
    if (showInactive) {
      return results;
    }
    return results.filter((r) => r.isActive);
  }, [results, showInactive]);

  // Handle feature selection
  const handleFeatureToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle select all / clear all for a kind
  const handleSelectAllKind = (kind: string) => {
    const kindFeatures = features.filter((f) => f.kind === kind);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const f of kindFeatures) {
        next.add(f.id);
      }
      return next;
    });
  };

  const handleClearKind = (kind: string) => {
    const kindFeatures = features.filter((f) => f.kind === kind);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const f of kindFeatures) {
        next.delete(f.id);
      }
      return next;
    });
  };

  // Calculate stats
  const activeCount = results.filter((r) => r.isActive).length;
  const totalCount = results.length;

  return (
    <div
      className={`tool-match-harness ${className ?? ''}`}
      style={style}
      data-testid="tool-match-harness"
    >
      {/* Features Panel */}
      <div className="tool-match-harness__features" data-testid="features-panel">
        <div className="tool-match-harness__header">
          <h3>Features</h3>
          <span className="tool-match-harness__count">
            {selectedIds.size} selected
          </span>
        </div>

        <div className="tool-match-harness__feature-list">
          {Array.from(groupedFeatures.entries()).map(([kind, kindFeatures]) => (
            <div key={kind} className="tool-match-harness__feature-group">
              <div className="tool-match-harness__group-header">
                <span className="tool-match-harness__group-label">
                  {getKindLabel(kind)}
                </span>
                <div className="tool-match-harness__group-actions">
                  <button
                    type="button"
                    onClick={() => handleSelectAllKind(kind)}
                    className="tool-match-harness__action-btn"
                    data-testid={`select-all-${kind.toLowerCase()}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearKind(kind)}
                    className="tool-match-harness__action-btn"
                    data-testid={`clear-${kind.toLowerCase()}`}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {kindFeatures.map((feature) => (
                <label
                  key={feature.id}
                  className="tool-match-harness__feature-item"
                  data-testid={`feature-${feature.id}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(feature.id)}
                    onChange={() => handleFeatureToggle(feature.id)}
                    data-testid={`checkbox-${feature.id}`}
                  />
                  <span className="tool-match-harness__feature-name">
                    {feature.name}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tools Panel */}
      <div className="tool-match-harness__tools" data-testid="tools-panel">
        <div className="tool-match-harness__header">
          <h3>Available Tools</h3>
          <span className="tool-match-harness__count">
            {activeCount} of {totalCount} active
          </span>
        </div>

        <div className="tool-match-harness__toggle">
          <label data-testid="show-inactive-toggle">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              data-testid="show-inactive-checkbox"
            />
            Show inactive tools
          </label>
        </div>

        <div className="tool-match-harness__tool-list" data-testid="tool-list">
          {visibleResults.length === 0 ? (
            <div
              className="tool-match-harness__empty"
              data-testid="tools-empty-state"
            >
              No tools available for current selection
            </div>
          ) : (
            visibleResults.map((result) => (
              <div
                key={result.tool.id}
                className={`tool-match-harness__tool-item ${
                  result.isActive ? 'tool-match-harness__tool-item--active' : 'tool-match-harness__tool-item--inactive'
                }`}
                data-testid={`tool-${result.tool.id}`}
                data-active={result.isActive}
              >
                <div className="tool-match-harness__tool-header">
                  <span className="tool-match-harness__tool-name">
                    {result.tool.name}
                  </span>
                  {result.isActive && (
                    <span
                      className="tool-match-harness__tool-badge"
                      data-testid={`badge-${result.tool.id}`}
                    >
                      Active
                    </span>
                  )}
                </div>
                {result.tool.description && (
                  <div className="tool-match-harness__tool-description">
                    {result.tool.description}
                  </div>
                )}
                {!result.isActive && result.explanation && (
                  <div
                    className="tool-match-harness__tool-explanation"
                    data-testid={`explanation-${result.tool.id}`}
                  >
                    {result.explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
