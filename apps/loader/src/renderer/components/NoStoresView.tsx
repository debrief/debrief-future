/**
 * View shown when no STAC stores are configured.
 * Provides options to create a local store or connect to remote.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './NoStoresView.css';

interface NoStoresViewProps {
  onStoreCreated: () => void;
}

export function NoStoresView({ onStoreCreated }: NoStoresViewProps) {
  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storePath, setStorePath] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = useCallback(async () => {
    // Open system folder picker, defaulting to documents or previously selected path
    const defaultPath = storePath || undefined;
    const selectedPath = await window.electronAPI.showFolderDialog(defaultPath);

    if (selectedPath) {
      setStorePath(selectedPath);
    }
  }, [storePath]);

  const handleCreate = useCallback(async () => {
    if (!storeName.trim() || !storePath.trim()) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Initialize new STAC catalog
      await window.electronAPI.initStore(storePath, storeName);

      // Register with config
      await window.electronAPI.addStore({ name: storeName, path: storePath });

      // Notify parent
      onStoreCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setCreating(false);
    }
  }, [storeName, storePath, onStoreCreated]);

  if (showCreateForm) {
    return (
      <div className="no-stores-view">
        <div className="no-stores-content">
          <h2 className="no-stores-title">{t('createStore.title')}</h2>

          <div className="create-store-form">
            <div className="form-field">
              <label htmlFor="store-name" className="form-label">
                {t('createStore.storeName')}
              </label>
              <input
                id="store-name"
                type="text"
                className="form-input"
                placeholder={t('createStore.storeNamePlaceholder')}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="store-path" className="form-label">
                {t('createStore.selectFolder')}
              </label>
              <div className="path-input-group">
                <input
                  id="store-path"
                  type="text"
                  className="form-input"
                  value={storePath}
                  onChange={(e) => setStorePath(e.target.value)}
                  readOnly
                />
                <button type="button" className="browse-btn" onClick={handleSelectFolder}>
                  ...
                </button>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="form-btn form-btn-secondary"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                className="form-btn form-btn-primary"
                onClick={handleCreate}
                disabled={!storeName.trim() || !storePath.trim() || creating}
              >
                {creating ? t('common.loading') : t('createStore.create')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-stores-view">
      <div className="no-stores-content">
        <div className="no-stores-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>

        <h2 className="no-stores-title">{t('noStores.title')}</h2>
        <p className="no-stores-message">{t('noStores.message')}</p>

        <div className="no-stores-actions">
          <button
            type="button"
            className="no-stores-btn no-stores-btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            {t('noStores.createLocal')}
          </button>
          <button type="button" className="no-stores-btn no-stores-btn-disabled" disabled>
            {t('noStores.connectRemote')} {t('noStores.comingSoon')}
          </button>
        </div>
      </div>
    </div>
  );
}
