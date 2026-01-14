/**
 * Full wizard flow stories showing the complete user journey.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/renderer/i18n';
import { StoreSelector } from '../src/renderer/components/StoreSelector';
import { PlotConfig } from '../src/renderer/components/PlotConfig';
import { ProgressView } from '../src/renderer/components/ProgressView';
import { SuccessView } from '../src/renderer/components/SuccessView';
import { ErrorView } from '../src/renderer/components/ErrorView';
import { NoStoresView } from '../src/renderer/components/NoStoresView';
import { WizardHeader } from '../src/renderer/components/common/WizardHeader';
import type { StacStoreInfo, PlotInfo, NewPlotForm } from '../src/renderer/types';

// Mock data
const mockStores: StacStoreInfo[] = [
  { id: 'local', name: 'Local Analysis Store', path: '/home/user/debrief/local-catalog', plotCount: 3, accessible: true },
  { id: 'project', name: 'Project Alpha Store', path: '/shared/projects/alpha/catalog', plotCount: 12, accessible: true },
];

const mockPlots: PlotInfo[] = [
  { id: 'plot1', name: 'Exercise Bravo', created: '2026-01-10T10:00:00Z', featureCount: 45 },
  { id: 'plot2', name: 'Operation Neptune', created: '2026-01-08T14:30:00Z', featureCount: 128 },
  { id: 'plot3', name: 'Training Run 3', created: '2026-01-05T09:15:00Z', featureCount: 23 },
];

type WizardStep = 'store-selection' | 'plot-configuration' | 'processing' | 'complete' | 'error' | 'no-stores';

/**
 * Interactive wizard component that simulates the full flow
 */
function InteractiveWizard({ initialStep = 'store-selection' }: { initialStep?: WizardStep }) {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [selectedStore, setSelectedStore] = useState<StacStoreInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'add-existing' | 'create-new'>('create-new');
  const [selectedPlot, setSelectedPlot] = useState<PlotInfo | null>(null);
  const [newPlotForm, setNewPlotForm] = useState<NewPlotForm>({ name: '', description: '', errors: {} });
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const fileName = 'exercise-data.rep';

  // Simulate processing
  const simulateProcessing = () => {
    setStep('processing');
    setProgress(0);
    setStatusMessage('Parsing file...');

    const steps = [
      { progress: 25, message: 'Parsing file...' },
      { progress: 50, message: 'Creating plot...' },
      { progress: 75, message: 'Adding features...' },
      { progress: 100, message: 'Copying asset...' },
    ];

    steps.forEach((s, i) => {
      setTimeout(() => {
        setProgress(s.progress);
        setStatusMessage(s.message);
        if (s.progress === 100) {
          setTimeout(() => setStep('complete'), 500);
        }
      }, (i + 1) * 800);
    });
  };

  if (step === 'no-stores') {
    return (
      <I18nextProvider i18n={i18n}>
        <div className="app-container" style={{ minHeight: '500px', background: '#f5f5f5', padding: '20px' }}>
          <WizardHeader fileName={fileName} />
          <NoStoresView onStoreCreated={() => setStep('store-selection')} />
        </div>
      </I18nextProvider>
    );
  }

  if (step === 'store-selection') {
    return (
      <I18nextProvider i18n={i18n}>
        <div className="app-container" style={{ minHeight: '500px', background: '#f5f5f5', padding: '20px' }}>
          <WizardHeader fileName={fileName} />
          <StoreSelector
            stores={mockStores}
            selectedStore={selectedStore}
            onSelect={setSelectedStore}
            onNext={() => setStep('plot-configuration')}
            onCancel={() => alert('Cancel clicked')}
          />
        </div>
      </I18nextProvider>
    );
  }

  if (step === 'plot-configuration') {
    return (
      <I18nextProvider i18n={i18n}>
        <div className="app-container" style={{ minHeight: '500px', background: '#f5f5f5', padding: '20px' }}>
          <WizardHeader fileName={fileName} storeName={selectedStore?.name} />
          <PlotConfig
            store={selectedStore || mockStores[0]}
            activeTab={activeTab}
            selectedPlot={selectedPlot}
            newPlotForm={newPlotForm}
            onTabChange={setActiveTab}
            onPlotSelect={setSelectedPlot}
            onNewPlotNameChange={(name) => setNewPlotForm({ ...newPlotForm, name })}
            onNewPlotDescriptionChange={(description) => setNewPlotForm({ ...newPlotForm, description })}
            onBack={() => setStep('store-selection')}
            onCancel={() => alert('Cancel clicked')}
            onLoad={simulateProcessing}
          />
        </div>
      </I18nextProvider>
    );
  }

  if (step === 'processing') {
    return (
      <I18nextProvider i18n={i18n}>
        <div className="app-container" style={{ minHeight: '500px', background: '#f5f5f5', padding: '20px' }}>
          <WizardHeader fileName={fileName} storeName={selectedStore?.name} />
          <ProgressView progress={progress} statusMessage={statusMessage} />
        </div>
      </I18nextProvider>
    );
  }

  if (step === 'complete') {
    return (
      <I18nextProvider i18n={i18n}>
        <div className="app-container" style={{ minHeight: '500px', background: '#f5f5f5', padding: '20px' }}>
          <SuccessView
            result={{
              plotId: 'new-plot',
              plotName: newPlotForm.name || 'Exercise Bravo Analysis',
              storeName: selectedStore?.name || 'Local Analysis Store',
              featuresAdded: 45,
              provenanceId: 'prov-123',
            }}
          />
        </div>
      </I18nextProvider>
    );
  }

  if (step === 'error') {
    return (
      <I18nextProvider i18n={i18n}>
        <div className="app-container" style={{ minHeight: '500px', background: '#f5f5f5', padding: '20px' }}>
          <ErrorView
            error={{
              code: 'PARSE_ERROR',
              message: 'Failed to parse file: Invalid format at line 42',
              details: 'Expected track identifier but found "INVALID" at position 128',
              suggestion: 'Check that the file is a valid REP format',
              retryable: true,
            }}
            onRetry={() => setStep('store-selection')}
          />
        </div>
      </I18nextProvider>
    );
  }

  return null;
}

const meta: Meta<typeof InteractiveWizard> = {
  title: 'Full Wizard/Interactive Flow',
  component: InteractiveWizard,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof InteractiveWizard>;

/**
 * Complete interactive wizard - start here to experience the full flow.
 * Click through: Select Store -> Configure Plot -> Load -> Success
 */
export const FullFlow: Story = {
  args: {
    initialStep: 'store-selection',
  },
};

/**
 * First-time user experience when no stores are configured.
 */
export const FirstTimeUser: Story = {
  args: {
    initialStep: 'no-stores',
  },
};

/**
 * Start at plot configuration step (after store selection).
 */
export const PlotConfigurationStep: Story = {
  args: {
    initialStep: 'plot-configuration',
  },
};

/**
 * View the processing animation.
 */
export const ProcessingStep: Story = {
  args: {
    initialStep: 'processing',
  },
};

/**
 * View the success state.
 */
export const SuccessStep: Story = {
  args: {
    initialStep: 'complete',
  },
};

/**
 * View the error state with retry option.
 */
export const ErrorStep: Story = {
  args: {
    initialStep: 'error',
  },
};
