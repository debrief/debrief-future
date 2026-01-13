/**
 * Tab content for adding to an existing plot.
 */

import { useTranslation } from 'react-i18next';
import type { PlotInfo } from '../../types/store';
import { PlotCard } from './PlotCard';
import './AddExistingTab.css';

interface AddExistingTabProps {
  plots: PlotInfo[];
  selectedPlot: PlotInfo | null;
  onSelect: (plot: PlotInfo) => void;
  loading: boolean;
}

export function AddExistingTab({ plots, selectedPlot, onSelect, loading }: AddExistingTabProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="add-existing-tab">
        <div className="add-existing-loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (plots.length === 0) {
    return (
      <div className="add-existing-tab">
        <div className="add-existing-empty">{t('plots.empty')}</div>
      </div>
    );
  }

  return (
    <div className="add-existing-tab">
      <div className="add-existing-list" role="radiogroup" aria-label={t('plots.selectPlot')}>
        {plots.map((plot) => (
          <PlotCard
            key={plot.id}
            plot={plot}
            selected={selectedPlot?.id === plot.id}
            onSelect={() => onSelect(plot)}
          />
        ))}
      </div>
    </div>
  );
}
