/**
 * MobileTabLayout — bottom-tab container for mobile viewports.
 *
 * Replaces GoldenLayout on narrow screens (<=767px). Renders the same panel
 * components via PanelContext, but in a simple tabbed layout with touch-friendly
 * targets instead of draggable/resizable panels.
 *
 * Feature: mobile-web-shell-preview
 */

import { useState } from 'react';
import { usePanelContext } from '../panels/PanelContext';
import { NavigationPanel } from '../panels/NavigationPanel';
import { ActivityPanelWrapper } from '../panels/ActivityPanelWrapper';
import { LogPanelWrapper } from '../panels/LogPanelWrapper';
import { ChartPanelWrapper } from '../panels/ChartPanelWrapper';
import './MobileTabLayout.css';

/** Tab definition for the mobile layout */
interface MobileTab {
  id: string;
  label: string;
  icon: string;
}

const TABS: MobileTab[] = [
  { id: 'map', label: 'Map', icon: 'codicon-map' },
  { id: 'activity', label: 'Activity', icon: 'codicon-pulse' },
  { id: 'navigation', label: 'Nav', icon: 'codicon-folder-opened' },
  { id: 'log', label: 'Log', icon: 'codicon-output' },
];

const RESULTS_TAB: MobileTab = { id: 'results', label: 'Results', icon: 'codicon-graph' };

/**
 * Mobile Map Panel — simplified version without GoldenLayout container resize.
 * Leaflet handles its own resize via the window resize event.
 */
function MobileMapPanel() {
  const ctx = usePanelContext();

  if (!ctx.mapViewProps) {
    return <div style={{ padding: 16, color: '#969696' }}>No plot loaded</div>;
  }

  const { MapView } = ctx.components;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }} data-testid="mobile-panel-map">
      <MapView {...ctx.mapViewProps} height="100%" className="web-shell__map" />
    </div>
  );
}

export interface MobileTabLayoutProps {
  /** Whether chart results are available (controls Results tab visibility) */
  hasResults?: boolean;
  /** Additional CSS class name */
  className?: string;
}

export function MobileTabLayout({ hasResults, className }: MobileTabLayoutProps) {
  const [activeTab, setActiveTab] = useState('map');

  const visibleTabs = hasResults ? [...TABS, RESULTS_TAB] : TABS;

  // If the active tab was results but results were cleared, fall back to map
  const effectiveTab = activeTab === 'results' && !hasResults ? 'map' : activeTab;

  return (
    <div className={`mobile-tabs ${className ?? ''}`} data-testid="mobile-tab-layout">
      <div className="mobile-tabs__content">
        {effectiveTab === 'map' && <MobileMapPanel />}
        {effectiveTab === 'activity' && <ActivityPanelWrapper />}
        {effectiveTab === 'navigation' && <NavigationPanel />}
        {effectiveTab === 'log' && <LogPanelWrapper />}
        {effectiveTab === 'results' && <ChartPanelWrapper />}
      </div>
      <nav className="mobile-tabs__bar" aria-label="Panel navigation">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`mobile-tabs__tab ${effectiveTab === tab.id ? 'mobile-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={effectiveTab === tab.id ? 'page' : undefined}
            aria-label={tab.label}
          >
            <span className={`mobile-tabs__icon codicon ${tab.icon}`} aria-hidden="true" />
            <span className="mobile-tabs__label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
