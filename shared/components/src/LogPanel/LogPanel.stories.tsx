/**
 * Storybook stories for the LogPanel component.
 *
 * Feature: 072-log-panel
 */

import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LogPanel } from './LogPanel';
import type {
  TimelineEntry,
  ViewMode,
  FilterState,
  LogPanelMessage,
  ParameterSchemaEntry,
} from './types';
import { DEFAULT_FILTER_STATE } from './types';
import { CardFlip } from './CardFlip';

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
    activity_id: 'act-005',
    timestamp: '2026-02-09T14:35:00Z',
    toolName: 'Range & Bearing',
    tool_version: '1.2.0',
    parameters: {
      maxRange: { value: 5000, default: false, tunable: true },
      units: { value: 'metres', default: true, tunable: false },
    },
    usedFeatureIds: ['track-alpha', 'track-bravo'],
    generatedFeatureIds: ['result-rb-001'],
    execution_duration: 'PT0.5S',
    generated_result_id: 'result-rb-001',
    operationCategory: 'calculation',
  },
  {
    activity_id: 'act-004',
    timestamp: '2026-02-09T14:30:00Z',
    toolName: 'Closest Approach',
    tool_version: '1.1.0',
    parameters: {
      threshold: { value: 2000, default: false, tunable: true },
    },
    usedFeatureIds: ['track-alpha', 'track-charlie'],
    generatedFeatureIds: ['result-cpa-001'],
    execution_duration: 'PT1.2S',
    generated_result_id: 'result-cpa-001',
    operationCategory: 'calculation',
  },
  {
    activity_id: 'act-003',
    timestamp: '2026-02-09T14:25:00Z',
    toolName: 'Track Statistics',
    tool_version: '1.0.0',
    parameters: {},
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.3S',
    generated_result_id: null,
    operationCategory: 'calculation',
  },
  {
    activity_id: 'act-002',
    timestamp: '2026-02-09T14:20:00Z',
    toolName: 'change-track-color',
    tool_version: '1.0.0',
    parameters: {
      color: { value: 'red', default: false, tunable: true },
    },
    usedFeatureIds: ['track-bravo'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.05S',
    generated_result_id: null,
    operationCategory: 'property-edit',
  },
  {
    activity_id: 'act-001',
    timestamp: '2026-02-09T14:00:00Z',
    toolName: 'load-rep',
    tool_version: '1.0.0',
    parameters: {
      file: { value: 'exercise_data.rep', default: false, tunable: false },
    },
    usedFeatureIds: [],
    generatedFeatureIds: ['track-alpha', 'track-bravo', 'track-charlie'],
    execution_duration: 'PT2.1S',
    generated_result_id: null,
    operationCategory: 'import',
  },
];

// Entry that references a deleted feature
const entryWithDeletedFeature: TimelineEntry = {
  activity_id: 'act-006',
  timestamp: '2026-02-09T14:40:00Z',
  toolName: 'Range & Bearing',
  tool_version: '1.2.0',
  parameters: {},
  usedFeatureIds: ['track-alpha', 'deleted-feature'],
  generatedFeatureIds: [],
  execution_duration: 'PT0.4S',
  generated_result_id: null,
  operationCategory: 'calculation',
};

// --- Interactive wrapper ---

function LogPanelInteractive(props: {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
  hasActiveSession: boolean;
  initialView?: ViewMode;
}) {
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
        viewMode={viewMode}
        selectedEntryId={selectedEntryId}
        filterState={filterState}
        hasActiveSession={props.hasActiveSession}
        plotName="Exercise Alpha"
        actionResultMessage={notification}
        onMessage={handleMessage}
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

// --- US3: View Modes (Feature 176: unified 4-tab) ---

export const CompactView: Story = {
  name: 'Compact View',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialView="compact"
    />
  ),
};

export const TimelineView: Story = {
  name: 'Timeline View',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialView="timeline"
    />
  ),
};

export const DetailedView: Story = {
  name: 'Detailed View',
  render: () => (
    <LogPanelInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
      initialView="detailed"
    />
  ),
};

// --- US4: Filters ---

export const FilterActive: Story = {
  name: 'Filter Active',
  render: () => {
    const Wrapper = () => {
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
            viewMode={viewMode}
            selectedEntryId={selectedEntryId}
            filterState={filterState}
            hasActiveSession={true}
            plotName="Exercise Alpha"
            actionResultMessage={null}
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

// --- Feature 113: Flip-Card Interaction ---

// Sample disabled entry
const disabledEntry: TimelineEntry = {
  ...sampleEntries[0],
  activity_id: 'act-disabled-001',
  disabled: true,
};

// Sample entry with rationale
const entryWithRationale: TimelineEntry = {
  ...sampleEntries[0],
  activity_id: 'act-rationale-001',
  rationale: 'Increased range to capture distant contacts from the latest exercise data.',
};

/**
 * Interactive flip-card wrapper that wires edit callbacks.
 */
function FlipCardInteractive(props: {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [notification, setNotification] = useState<string | null>(null);
  const [localEntries, setLocalEntries] = useState(props.entries);

  const handleMessage = useCallback((message: LogPanelMessage) => {
    if (message.type === 'action:invoke') {
      setNotification(`Action "${message.payload.actionType}" invoked.`);
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const handleSchemaRequest = useCallback(
    (toolId: string): Promise<ReadonlyArray<ParameterSchemaEntry>> => {
      // Derive mock schema from matching entry's parameters
      const entry = localEntries.find((e) => e.toolName === toolId);
      const schema: ParameterSchemaEntry[] = [];
      if (entry) {
        for (const [name, param] of Object.entries(entry.parameters)) {
          const isNum = typeof param.value === 'number';
          const isColor = name === 'color';
          schema.push({
            name,
            type: isNum ? 'number' : 'string',
            description: null,
            tunable: param.tunable,
            defaultValue: param.default ? param.value : null,
            minimum: isNum ? 0 : null,
            maximum: isNum ? Number(param.value) * 3 : null,
            step: isNum ? 1 : null,
            choices: isColor ? ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'magenta', 'white', 'pink', 'navy', 'teal'] : null,
            paramType: isColor ? 'NamedColor' : null,
          });
        }
      }
      return Promise.resolve(schema);
    },
    [localEntries]
  );

  const handleDisableToggle = useCallback((activityId: string, disabled: boolean) => {
    setLocalEntries((prev) =>
      prev.map((e) => (e.activity_id === activityId ? { ...e, disabled } : e))
    );
  }, []);

  const handleRationaleUpdate = useCallback((activityId: string, rationale: string) => {
    setLocalEntries((prev) =>
      prev.map((e) => (e.activity_id === activityId ? { ...e, rationale } : e))
    );
  }, []);

  return (
    <div style={{ width: 320, height: 600, border: '1px solid #333' }}>
      <LogPanel
        entries={localEntries}
        featureNames={props.featureNames}
        viewMode={viewMode}
        selectedEntryId={selectedEntryId}
        filterState={filterState}
        hasActiveSession={true}
        plotName="Exercise Alpha"
        actionResultMessage={notification}
        onMessage={handleMessage}
        onViewModeChange={setViewMode}
        onFilterStateChange={setFilterState}
        onSelectedEntryChange={setSelectedEntryId}
        onSchemaRequest={handleSchemaRequest}
        onDisableToggle={handleDisableToggle}
        onRationaleUpdate={handleRationaleUpdate}
      />
    </div>
  );
}

export const FlipCardDefault: Story = {
  name: 'Flip Card — Edit Icon',
  render: () => (
    <FlipCardInteractive
      entries={sampleEntries}
      featureNames={sampleFeatureNames}
    />
  ),
};

export const FlipCardDisabled: Story = {
  name: 'Flip Card — Disabled Entry',
  render: () => (
    <FlipCardInteractive
      entries={[disabledEntry, ...sampleEntries.slice(1)]}
      featureNames={sampleFeatureNames}
    />
  ),
};

export const FlipCardRationale: Story = {
  name: 'Flip Card — With Rationale',
  render: () => (
    <FlipCardInteractive
      entries={[entryWithRationale, ...sampleEntries.slice(1)]}
      featureNames={sampleFeatureNames}
    />
  ),
};

// --- CardFlip primitive story ---
export const CardFlipPrimitive: Story = {
  name: 'CardFlip Primitive',
  render: () => {
    const Wrapper = () => {
      const [isFlipped, setIsFlipped] = useState(false);
      return (
        <div style={{ width: 320, padding: 16 }}>
          <button onClick={() => setIsFlipped(!isFlipped)} style={{ marginBottom: 8 }}>
            {isFlipped ? 'Show Front' : 'Show Back'}
          </button>
          <CardFlip
            isFlipped={isFlipped}
            front={
              <div style={{ padding: 16, background: '#1e1e1e', border: '1px solid #333' }}>
                <strong>Front Face</strong>
                <p>Tool name, features, parameters</p>
              </div>
            }
            back={
              <div style={{ padding: 16, background: '#252526', border: '1px solid #333' }}>
                <strong>Back Face (Edit)</strong>
                <p>Parameter controls, rationale, disable</p>
              </div>
            }
          />
        </div>
      );
    };
    return <Wrapper />;
  },
};

// --- Feature 176: Rich card focused stories (T015) ---

/**
 * Displays one card per defined ToolCategory, plus the neutral-grey
 * fallback, so reviewers can compare all icon styles at a glance.
 */
const allCategoriesEntries: TimelineEntry[] = [
  {
    activity_id: 'cat-import',
    timestamp: '2026-04-19T09:00:00Z',
    toolName: 'import-rep',
    tool_version: '1.0.0',
    parameters: { file: { value: 'alpha.rep', default: false } },
    usedFeatureIds: [],
    generatedFeatureIds: ['track-alpha'],
    execution_duration: 'PT1.2S',
    generated_result_id: null,
    operationCategory: 'import',
  },
  {
    activity_id: 'cat-style',
    timestamp: '2026-04-19T09:01:00Z',
    toolName: 'change-color',
    tool_version: '1.0.0',
    parameters: { color: { value: '#e11d48', default: false } },
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.1S',
    generated_result_id: null,
    operationCategory: 'property-edit',
  },
  {
    activity_id: 'cat-calc',
    timestamp: '2026-04-19T09:02:00Z',
    toolName: 'bearing-between-tracks',
    tool_version: '1.2.0',
    parameters: { maxRange: { value: 5000, default: false } },
    usedFeatureIds: ['track-alpha', 'track-bravo'],
    generatedFeatureIds: [],
    execution_duration: 'PT2.3S',
    generated_result_id: null,
    operationCategory: 'calculation',
  },
  {
    activity_id: 'cat-filter',
    timestamp: '2026-04-19T09:03:00Z',
    toolName: 'time-filter',
    tool_version: '1.0.0',
    parameters: { mode: { value: 'include', default: false } },
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.05S',
    generated_result_id: null,
    operationCategory: 'calculation',
  },
  {
    // Snapshot demo: post-feature-208, snapshot rendering is driven by the
    // PROV-side `kind` discriminator, not by the tool's visual ToolCategory.
    // The story retains its manual-checkpoint-placeholder appearance because
    // `kind: 'snapshot'` is set explicitly — previously it appeared only
    // because export-png happens to share the 'snapshot' visual category.
    activity_id: 'cat-snapshot',
    timestamp: '2026-04-19T09:04:00Z',
    toolName: 'export-png',
    tool_version: '1.0.0',
    parameters: {},
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.4S',
    generated_result_id: null,
    operationCategory: 'export',
    kind: 'snapshot',
  },
  {
    activity_id: 'cat-unknown',
    timestamp: '2026-04-19T09:05:00Z',
    toolName: 'custom-unknown-tool',
    tool_version: '0.0.1',
    parameters: { note: { value: 'fallback', default: false } },
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.2S',
    generated_result_id: null,
    operationCategory: 'calculation',
  },
];

export const AllCategories: Story = {
  name: 'Rich Card — All Categories',
  render: () => (
    <LogPanelInteractive
      entries={allCategoriesEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};

/**
 * One entry carrying one parameter of every chip type + overflow indicator.
 */
const allChipTypesEntry: TimelineEntry = {
  activity_id: 'chip-matrix',
  timestamp: '2026-04-19T10:00:00Z',
  toolName: 'bearing-between-tracks',
  tool_version: '1.2.0',
  parameters: {
    colour: { value: '#00aa55', default: false },
    speed: { value: 12, default: false },
    mode: { value: 'auto', default: false },
    visible: { value: true, default: false },
    range: { value: '10-200', default: false },
    plain: { value: 'HMS Alpha', default: true },
    extra1: { value: 1, default: true },
    extra2: { value: 2, default: true },
  },
  usedFeatureIds: ['track-alpha'],
  generatedFeatureIds: [],
  execution_duration: 'PT1.0S',
  generated_result_id: null,
  operationCategory: 'calculation',
};

export const AllChipTypes: Story = {
  name: 'Rich Card — All Chip Types',
  render: () => (
    <LogPanelInteractive
      entries={[allChipTypesEntry]}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};

const edgeCaseEntries: TimelineEntry[] = [
  {
    // Snapshot demo: kind-driven (feature 208). See analogous comment on
    // `cat-snapshot` in allCategoriesEntries.
    activity_id: 'edge-snapshot',
    timestamp: '2026-04-19T11:00:00Z',
    toolName: 'export-png',
    tool_version: '1.0.0',
    parameters: {},
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.3S',
    generated_result_id: null,
    operationCategory: 'export',
    kind: 'snapshot',
  },
  {
    activity_id: 'edge-noparams',
    timestamp: '2026-04-19T11:01:00Z',
    toolName: 'bearing-between-tracks',
    tool_version: '1.2.0',
    parameters: {},
    usedFeatureIds: ['track-alpha', 'track-bravo'],
    generatedFeatureIds: [],
    execution_duration: 'PT0.2S',
    generated_result_id: null,
    operationCategory: 'calculation',
  },
  {
    activity_id: 'edge-missing-dur',
    timestamp: '2026-04-19T11:02:00Z',
    toolName: 'change-color',
    tool_version: '1.0.0',
    parameters: { color: { value: 'red', default: false } },
    usedFeatureIds: ['track-alpha'],
    generatedFeatureIds: [],
    execution_duration: '',
    generated_result_id: null,
    operationCategory: 'property-edit',
  },
  {
    activity_id: 'edge-multi-track',
    timestamp: '2026-04-19T11:03:00Z',
    toolName: 'bearing-between-tracks',
    tool_version: '1.2.0',
    parameters: { maxRange: { value: 5000, default: false } },
    usedFeatureIds: ['track-alpha', 'track-bravo', 'track-charlie'],
    generatedFeatureIds: [],
    execution_duration: 'PT1.4S',
    generated_result_id: null,
    operationCategory: 'calculation',
  },
];

export const EdgeCases: Story = {
  name: 'Rich Card — Edge Cases',
  render: () => (
    <LogPanelInteractive
      entries={edgeCaseEntries}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};

const disabledEntryVariant: TimelineEntry = {
  activity_id: 'disabled-sample',
  timestamp: '2026-04-19T12:00:00Z',
  toolName: 'bearing-between-tracks',
  tool_version: '1.2.0',
  parameters: {
    maxRange: { value: 5000, default: false },
    units: { value: 'metres', default: true },
  },
  usedFeatureIds: ['track-alpha', 'track-bravo'],
  generatedFeatureIds: [],
  execution_duration: 'PT0.9S',
  generated_result_id: null,
  operationCategory: 'calculation',
  disabled: true,
};

export const DisabledCard: Story = {
  name: 'Rich Card — Disabled',
  render: () => (
    <LogPanelInteractive
      entries={[disabledEntryVariant, ...sampleEntries.slice(1)]}
      featureNames={sampleFeatureNames}
      hasActiveSession={true}
    />
  ),
};
