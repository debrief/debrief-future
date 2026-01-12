/**
 * Card component for displaying a single STAC store.
 */

import { useTranslation } from 'react-i18next';
import type { StacStoreInfo } from '../../types/store';
import './StoreCard.css';

interface StoreCardProps {
  store: StacStoreInfo;
  selected: boolean;
  onSelect: () => void;
}

export function StoreCard({ store, selected, onSelect }: StoreCardProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (store.accessible) {
        onSelect();
      }
    }
  };

  return (
    <div
      className={`store-card ${selected ? 'store-card-selected' : ''} ${
        !store.accessible ? 'store-card-disabled' : ''
      }`}
      role="radio"
      aria-checked={selected}
      aria-disabled={!store.accessible}
      tabIndex={store.accessible ? 0 : -1}
      onClick={store.accessible ? onSelect : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="store-card-radio">
        <span className={`store-card-radio-dot ${selected ? 'store-card-radio-dot-selected' : ''}`} />
      </div>
      <div className="store-card-content">
        <div className="store-card-name">{store.name}</div>
        <div className="store-card-path">{store.path}</div>
        <div className="store-card-meta">
          {store.accessible ? (
            <span className="store-card-plots">
              {t('stores.plotCount', { count: store.plotCount })}
            </span>
          ) : (
            <span className="store-card-error">
              {t('stores.inaccessible')}: {store.accessError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
