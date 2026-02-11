/**
 * Storybook stories for the LogPanel component.
 *
 * Feature: 072-log-panel
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LogPanel } from './LogPanel';
import type {
  TimelineEntry,
  PresentationMode,
  ViewMode,
  FilterState,
  LogPanelMessage,
} from './types';
import { DEFAULT_FILTER_STATE } from './types';

// --- Sample data ---

const sampleFeatureNames: Record<string, string> = {
  'track-alpha': 'Track Alpha',
  'track-bravo': 'Track Bravo',
  'track-charlie': 'Track Charlie',
  'result-rb-001': 'Range & Bearing Result',
  'result-cpa-001': 'CPA Result',
  'deleted-feature': undefined as unknown as string, // simulate missing feature
};

const sampleEntries: TimelineEntry[] = [
  {
    activityId: 'act-005',
    timestamp: '2026-02-09T14:35:00Z',
    toolName: 'Range & Bearing',
    toolVersion: '1.2.0',
    parameters: {
      maxRange: { value: 5000, default: false, tunable: true },
      units: { value: 'metres', default: true, tunable: false },
    },
    usedFeatureIds: ['track-alpha', 'track-bravo'],
    generatedFeatureIds: ['result-rb-001'],
    executionDuration: 'PT0.5S',
    generatedResultId: 'result-rb-001',
    operationCategory: 'calculation',
  },
  {
    activityId: 'act-004',
    timestamp: '2026-02-09T14:30:00Z',
    toolName: 'Closest Approach',
    toolVersion: '1.1.0',
    parameters: {
      threshold: { value: 2000, default: false, tunable: true },
    },
    usedFeatureIds: ['track-alpha', 'track-charlie'],
    generatedFeatureIds: ['result-cpa-001'],
    executionDuration: 'PT1.2S',
    generatedResultId: 'result-cpa-001',
    operationCategory: 'calculation',
  },
  {
    activityId: 'act-003',
    timestamp: '2026-02-09T14:25:00Z',
    toolName: 'Track Statistics',
    toolVersion: '1.0.0',
    parameters: {},
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    executionDuration: 'PT0.3S',
    generatedResultId: null,
    operationCategory: 'calculation',
  },
  {
    activityId: 'act-002',
    timestamp: '2026-02-09T14:20:00Z',
    toolName: 'change-track-color',
    toolVersion: '1.0.0',
    parameters: {
      color: { value: '#ff0000', default: false, tunable: false },
    },
    usedFeatureIds: ['track-bravo'],
    generatedFeatureIds: [],
    executionDuration: 'PT0.05S',
    generatedResultId: null,
    operationCategory: 'property-edit',
  },
  {
    activityId: 'act-001',
    timestamp: '2026-02-09T14:00:00Z',
    toolName: 'load-rep',
    toolVersion: '1.0.0',
    parameters: {
      file: { value: 'exercise_data.rep', default: false, tunable: false },
    },
    usedFeatureIds: [],
    generatedFeatureIds: ['track-alpha', 'track-bravo', 'track-charlie'],
    executionDuration: 'PT2.1S',
    generatedResultId: null,
    operationCategory: 'import',
  },
];

// Entry that references a deleted feature
const entryWithDeletedFeature: TimelineEntry = {
  activityId: 'act-006',
  timestamp: '2026-02-09T14:40:00Z',
  toolName: 'Range & Bearing',
  toolVersion: '1.2.0',
  parameters: {},
  usedFeatureIds: ['track-alpha', 'deleted-feature'],
  generatedFeatureIds: [],
  executionDuration: 'PT0.4S',
  generatedResultId: null,
  operationCategory: 'calculation',
};

// --- Interactive wrapper ---

function LogPanelInteractive(props: {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
  hasActiveSession: boolean;
  initialMode?: PresentationMode;
  initialView?: ViewMode;
}) {
  const [presentationMode, setPresentationMode] = useState<PresentationMode>(
    props.initialMode ?? 'normal'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(props.initialView ?? 'timeline');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [notification, setNotification] = useState<string | null>(null);

  const handleMessage = (message: LogPanelMessage) => {
    if (message.type === 'action:invoke') {
      setNotification(`Action "${message.payload.actionType}" is not yet available.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div style={{ width: 320, height: 600, border: '1px solid #333' }}>
      <LogPanel
        entries={props.entries}
        featureNames={props.featureNames}
        presentationMode={presentationMode}
        viewMode={viewMode}
        selectedEntryId={selectedEntryId}
        filterState={filterState}
        hasActiveSession={props.hasActiveSession}
        plotName="Exercise Alpha"
        actionResultMessage={notification}
        onMessage={handleMessage}
        onPresentationModeChange={setPresentationMode}
        onViewModeChange={setViewMode}
        onFilterStateChange={setFilterState}
        onSelectedEntryChange={setSelectedEntryId}
      />
    </div>
  );
}

// --- Storybook config ---

const meta: Meta<typeof LogPanel> = {
  title: 'LogPanel',
  component: LogPanel,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof LogPanel>;

// --- US1: Timeline View ---

export const TimelineDefault: Story = {
  name: 'Timeline Default',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};

export const EmptyNoPlot: Story = {
  name: 'Empty State (No Plot)',
  render: () => (
    <LogPanelInteractive
      entries={[]}
      featureNames={{}}
      hasActiveSession={false}
    />
  ),
};

export const EmptyNoEntries: Story = {
  name: 'Empty State (No Entries)',
  render: () => (
    <LogPanelInteractive
      entries={[]}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};

// --- US2: Selection ---

export const EntrySelected: Story = {
  name: 'Entry Selected',
  render: () => {
    // Pre-selected state wrapper
    const Wrapper = () => {
      const [selectedEntryId, setSelectedEntryId] = useState<string | null>('act-005');
      const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

      return (
        <div style={{ width: 320, height: 600, border: '1px solid #333' }}>
          <LogPanel
            entries={sampleEntries}
            featureNames={sampleFeatureNames}
            presentationMode="normal"
            viewMode="timeline"
            selectedEntryId={selectedEntryId}
            filterState={filterState}
            hasActiveSession={true}
            plotName="Exercise Alpha"
            actionResultMessage={null}
            onFilterStateChange={setFilterState}
            onSelectedEntryChange={setSelectedEntryId}
          />
        </div>
      );
    };
    return <Wrapper />;
  },
};

export const EntryWithDeletedFeature: Story = {
  name: 'Entry with Deleted Feature',
  render: () => (
    <LogPanelInteractive
      entries={[entryWithDeletedFeature, ...sampleEntries]}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};

// --- US3: Presentation Modes ---

export const CompactMode: Story = {
  name: 'Compact Mode',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialMode="compact"
    />
  ),
};

export const NormalMode: Story = {
  name: 'Normal Mode',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialMode="normal"
    />
  ),
};

export const DetailedMode: Story = {
  name: 'Detailed Mode',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialMode="detailed"
    />
  ),
};

// --- US4: Filters ---

export const FilterActive: Story = {
  name: 'Filter Active',
  render: () => {
    const Wrapper = () => {
      const [presentationMode, setPresentationMode] = useState<PresentationMode>('normal');
      const [viewMode, setViewMode] = useState<ViewMode>('timeline');
      const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
      const [filterState, setFilterState] = useState<FilterState>({
        searchText: '',
        toolType: null,
        operationCategory: null,
        isExpanded: true,
      });

      return (
        <div style={{ width: 320, height: 600, border: '1px solid #333' }}>
          <LogPanel
            entries={sampleEntries}
            featureNames={sampleFeatureNames}
            presentationMode={presentationMode}
            viewMode={viewMode}
            selectedEntryId={selectedEntryId}
            filterState={filterState}
            hasActiveSession={true}
            plotName="Exercise Alpha"
            actionResultMessage={null}
            onPresentationModeChange={setPresentationMode}
            onViewModeChange={setViewMode}
            onFilterStateChange={setFilterState}
            onSelectedEntryChange={setSelectedEntryId}
          />
        </div>
      );
    };
    return <Wrapper />;
  },
};

// --- US5: By-Feature View ---

export const ByFeatureView: Story = {
  name: 'By-Feature View',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialView="by-feature"
    />
  ),
};

// --- US6: Actions ---

export const ActionsDisabled: Story = {
  name: 'Actions Disabled (No Selection)',
  render: () => {
    const Wrapper = () => {
      const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

      return (
        <div style={{ width: 320, height: 600, border: '1px solid #333' }}>
          <LogPanel
            entries={sampleEntries}
            featureNames={sampleFeatureNames}
            presentationMode="normal"
            viewMode="timeline"
            selectedEntryId={null}
            filterState={filterState}
            hasActiveSession={true}
            plotName="Exercise Alpha"
            actionResultMessage={null}
            onFilterStateChange={setFilterState}
          />
        </div>
      );
    };
    return <Wrapper />;
  },
};
