/**
 * Store selector component for wizard step 1.
 */

import { useTranslation } from 'react-i18next';
import type { StacStoreInfo } from '../../types/store';
import { StoreCard } from './StoreCard';
import { WizardNavigation } from '../common/WizardNavigation';
import './StoreSelector.css';

interface StoreSelectorProps {
  stores: StacStoreInfo[];
  selectedStore: StacStoreInfo | null;
  onSelect: (store: StacStoreInfo) => void;
  onRecreate: (store: StacStoreInfo) => void;
  onRemove: (store: StacStoreInfo) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function StoreSelector({
  stores,
  selectedStore,
  onSelect,
  onRecreate,
  onRemove,
  onNext,
  onCancel,
}: StoreSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="store-selector">
      <div className="store-selector-content">
        <h2 className="store-selector-title">{t('stores.title')}</h2>

        <div className="store-selector-list" role="radiogroup" aria-label={t('stores.title')}>
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              selected={selectedStore?.id === store.id}
              onSelect={() => onSelect(store)}
              onRecreate={onRecreate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>

      <WizardNavigation
        showNext
        nextDisabled={!selectedStore || !selectedStore.accessible}
        onCancel={onCancel}
        onNext={onNext}
      />
    </div>
  );
}

export { StoreCard } from './StoreCard';
