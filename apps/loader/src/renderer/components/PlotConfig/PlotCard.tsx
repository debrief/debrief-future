/**
 * Card component for displaying a single plot.
 */

import { useTranslation } from 'react-i18next';
import type { PlotInfo } from '../../types/store';
import './PlotCard.css';

interface PlotCardProps {
  plot: PlotInfo;
  selected: boolean;
  onSelect: () => void;
}

export function PlotCard({ plot, selected, onSelect }: PlotCardProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`plot-card ${selected ? 'plot-card-selected' : ''}`}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="plot-card-radio">
        <span className={`plot-card-radio-dot ${selected ? 'plot-card-radio-dot-selected' : ''}`} />
      </div>
      <div className="plot-card-content">
        <div className="plot-card-name">{plot.name}</div>
        <div className="plot-card-meta">
          <span className="plot-card-date">
            {t('plots.created', { date: formatDate(plot.created) })}
          </span>
          <span className="plot-card-separator">·</span>
          <span className="plot-card-features">
            {t('plots.featureCount', { count: plot.featureCount })}
          </span>
        </div>
      </div>
    </div>
  );
}
