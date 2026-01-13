/**
 * Plot configuration component for wizard step 2.
 * Contains tabbed interface for "Add to Existing" and "Create New" options.
 */

import { useTranslation } from 'react-i18next';
import type { StacStoreInfo, PlotInfo } from '../../types/store';
import type { NewPlotForm } from '../../types/forms';
import { usePlots } from '../../hooks/usePlots';
import { CreateNewTab } from './CreateNewTab';
import { AddExistingTab } from './AddExistingTab';
import { WizardNavigation } from '../common/WizardNavigation';
import './PlotConfig.css';

interface PlotConfigProps {
  store: StacStoreInfo;
  activeTab: 'add-existing' | 'create-new';
  selectedPlot: PlotInfo | null;
  newPlotForm: NewPlotForm;
  onTabChange: (tab: 'add-existing' | 'create-new') => void;
  onPlotSelect: (plot: PlotInfo | null) => void;
  onNewPlotNameChange: (name: string) => void;
  onNewPlotDescriptionChange: (description: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onLoad: () => void;
}

export function PlotConfig({
  store,
  activeTab,
  selectedPlot,
  newPlotForm,
  onTabChange,
  onPlotSelect,
  onNewPlotNameChange,
  onNewPlotDescriptionChange,
  onBack,
  onCancel,
  onLoad,
}: PlotConfigProps) {
  const { t } = useTranslation();
  const { plots, loading: plotsLoading } = usePlots(store.path);

  // Determine if load button should be enabled
  const canLoad =
    activeTab === 'create-new'
      ? newPlotForm.name.trim().length > 0 && !newPlotForm.errors.name
      : selectedPlot !== null;

  return (
    <div className="plot-config">
      <div className="plot-config-content">
        <h2 className="plot-config-title">{t('plots.title')}</h2>

        {/* Tab header */}
        <div className="plot-config-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'add-existing'}
            className={`plot-config-tab ${activeTab === 'add-existing' ? 'plot-config-tab-active' : ''}`}
            onClick={() => onTabChange('add-existing')}
          >
            {t('plots.tabAddExisting')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'create-new'}
            className={`plot-config-tab ${activeTab === 'create-new' ? 'plot-config-tab-active' : ''}`}
            onClick={() => onTabChange('create-new')}
          >
            {t('plots.tabCreateNew')}
          </button>
        </div>

        {/* Tab content */}
        <div className="plot-config-panel" role="tabpanel">
          {activeTab === 'add-existing' ? (
            <AddExistingTab
              plots={plots || []}
              selectedPlot={selectedPlot}
              onSelect={onPlotSelect}
              loading={plotsLoading}
            />
          ) : (
            <CreateNewTab
              form={newPlotForm}
              onNameChange={onNewPlotNameChange}
              onDescriptionChange={onNewPlotDescriptionChange}
            />
          )}
        </div>
      </div>

      <WizardNavigation
        showBack
        showLoad
        loadDisabled={!canLoad}
        onBack={onBack}
        onCancel={onCancel}
        onLoad={onLoad}
      />
    </div>
  );
}

export { CreateNewTab } from './CreateNewTab';
export { AddExistingTab } from './AddExistingTab';
export { PlotCard } from './PlotCard';
