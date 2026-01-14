/**
 * Root application component.
 * Manages wizard state and step transitions.
 */

import { useEffect, useReducer, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoaderState, SourceFile, StacStoreInfo, PlotInfo, LoadResult, LoaderError } from './types';
import { StoreSelector } from './components/StoreSelector';
import { PlotConfig } from './components/PlotConfig';
import { ProgressView } from './components/ProgressView';
import { SuccessView } from './components/SuccessView';
import { ErrorView } from './components/ErrorView';
import { NoStoresView } from './components/NoStoresView';
import { WizardHeader } from './components/common/WizardHeader';
import { useStores } from './hooks/useStores';
import { useLoadWorkflow } from './hooks/useLoadWorkflow';

type LoaderAction =
  | { type: 'SET_FILE'; file: SourceFile }
  | { type: 'SET_STORES'; stores: StacStoreInfo[] }
  | { type: 'SELECT_STORE'; store: StacStoreInfo }
  | { type: 'SET_TAB'; tab: 'add-existing' | 'create-new' }
  | { type: 'SELECT_PLOT'; plot: PlotInfo | null }
  | { type: 'SET_NEW_PLOT_NAME'; name: string }
  | { type: 'SET_NEW_PLOT_DESCRIPTION'; description: string }
  | { type: 'SET_NEW_PLOT_ERROR'; error: string | undefined }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'START_PROCESSING' }
  | { type: 'SET_PROGRESS'; progress: number; message: string }
  | { type: 'SET_COMPLETE'; result: LoadResult }
  | { type: 'SET_ERROR'; error: LoaderError }
  | { type: 'RESET' };

const initialState: LoaderState = {
  step: 'store-selection',
  sourceFile: { path: '', name: '', size: 0, format: 'unknown' },
  availableStores: [],
  selectedStore: null,
  plotTab: 'create-new',
  selectedPlot: null,
  newPlotForm: { name: '', description: '', errors: {} },
  progress: 0,
  statusMessage: '',
  error: null,
  result: null,
};

function loaderReducer(state: LoaderState, action: LoaderAction): LoaderState {
  switch (action.type) {
    case 'SET_FILE':
      return { ...state, sourceFile: action.file };
    case 'SET_STORES':
      return { ...state, availableStores: action.stores };
    case 'SELECT_STORE':
      return { ...state, selectedStore: action.store };
    case 'SET_TAB':
      return { ...state, plotTab: action.tab, selectedPlot: null };
    case 'SELECT_PLOT':
      return { ...state, selectedPlot: action.plot };
    case 'SET_NEW_PLOT_NAME':
      return {
        ...state,
        newPlotForm: { ...state.newPlotForm, name: action.name, errors: {} },
      };
    case 'SET_NEW_PLOT_DESCRIPTION':
      return {
        ...state,
        newPlotForm: { ...state.newPlotForm, description: action.description },
      };
    case 'SET_NEW_PLOT_ERROR':
      return {
        ...state,
        newPlotForm: { ...state.newPlotForm, errors: { name: action.error } },
      };
    case 'NEXT_STEP':
      if (state.step === 'store-selection') {
        return { ...state, step: 'plot-configuration' };
      }
      return state;
    case 'PREV_STEP':
      if (state.step === 'plot-configuration') {
        return { ...state, step: 'store-selection' };
      }
      return state;
    case 'START_PROCESSING':
      return { ...state, step: 'processing', progress: 0, statusMessage: '' };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress, statusMessage: action.message };
    case 'SET_COMPLETE':
      return { ...state, step: 'complete', result: action.result };
    case 'SET_ERROR':
      return { ...state, step: 'error', error: action.error };
    case 'RESET':
      return { ...initialState, sourceFile: state.sourceFile, availableStores: state.availableStores };
    default:
      return state;
  }
}

export function App() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(loaderReducer, initialState);
  const { stores, loading: storesLoading, error: storesError, refreshStores } = useStores();
  const { executeLoad } = useLoadWorkflow();

  // Update stores when loaded
  useEffect(() => {
    if (stores) {
      dispatch({ type: 'SET_STORES', stores });
    }
  }, [stores]);

  // Handle file opened event from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.onFileOpened((filePath: string) => {
      const fileName = filePath.split(/[/\\]/).pop() || '';
      const format = fileName.endsWith('.rep') ? 'rep' : 'unknown';
      dispatch({
        type: 'SET_FILE',
        file: { path: filePath, name: fileName, size: 0, format },
      });
    });

    return unsubscribe;
  }, []);

  const handleStoreSelect = useCallback((store: StacStoreInfo) => {
    dispatch({ type: 'SELECT_STORE', store });
  }, []);

  const handleStoreRecreate = useCallback(
    async (store: StacStoreInfo) => {
      try {
        // Recreate the catalog at the same path
        await window.electronAPI.initStore(store.path, store.name);
        // Refresh the stores list to update accessibility
        refreshStores();
      } catch (err) {
        console.error('Failed to recreate store:', err);
      }
    },
    [refreshStores]
  );

  const handleStoreRemove = useCallback(
    async (store: StacStoreInfo) => {
      try {
        await window.electronAPI.removeStore(store.id);
        // Refresh the stores list
        refreshStores();
      } catch (err) {
        console.error('Failed to remove store:', err);
      }
    },
    [refreshStores]
  );

  const handleNext = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const handleBack = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const handleCancel = useCallback(() => {
    window.close();
  }, []);

  const handleTabChange = useCallback((tab: 'add-existing' | 'create-new') => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const handlePlotSelect = useCallback((plot: PlotInfo | null) => {
    dispatch({ type: 'SELECT_PLOT', plot });
  }, []);

  const handleNewPlotNameChange = useCallback((name: string) => {
    dispatch({ type: 'SET_NEW_PLOT_NAME', name });
  }, []);

  const handleNewPlotDescriptionChange = useCallback((description: string) => {
    dispatch({ type: 'SET_NEW_PLOT_DESCRIPTION', description });
  }, []);

  const handleLoad = useCallback(async () => {
    if (!state.selectedStore) return;

    dispatch({ type: 'START_PROCESSING' });

    try {
      const result = await executeLoad({
        sourceFile: state.sourceFile,
        store: state.selectedStore,
        mode: state.plotTab === 'create-new' ? 'create' : 'existing',
        newPlotName: state.newPlotForm.name,
        newPlotDescription: state.newPlotForm.description,
        existingPlotId: state.selectedPlot?.id,
        onProgress: (progress, message) => {
          dispatch({ type: 'SET_PROGRESS', progress, message });
        },
      });

      dispatch({ type: 'SET_COMPLETE', result });
    } catch (err) {
      const error: LoaderError = {
        code: 'UNKNOWN',
        message: err instanceof Error ? err.message : t('errors.unknown'),
        retryable: true,
      };
      dispatch({ type: 'SET_ERROR', error });
    }
  }, [state, executeLoad, t]);

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleStoreCreated = useCallback(async () => {
    await refreshStores();
  }, [refreshStores]);

  // Loading state
  if (storesLoading) {
    return (
      <div className="app-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  // Error loading stores
  if (storesError) {
    return (
      <div className="app-container">
        <ErrorView
          error={{
            code: 'SERVICE_ERROR',
            message: storesError.message,
            retryable: true,
          }}
          onRetry={refreshStores}
        />
      </div>
    );
  }

  // No file provided - show waiting for file view
  if (!state.sourceFile.path) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1 className="app-title">{t('app.title')}</h1>
        </div>
        <div className="no-file-view">
          <div className="no-file-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="no-file-title">{t('noFile.title')}</h2>
          <p className="no-file-message">{t('noFile.message')}</p>
        </div>
      </div>
    );
  }

  // No stores configured
  if (state.availableStores.length === 0 && state.step === 'store-selection') {
    return (
      <div className="app-container">
        <WizardHeader fileName={state.sourceFile.name} />
        <NoStoresView onStoreCreated={handleStoreCreated} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <WizardHeader fileName={state.sourceFile.name} storeName={state.selectedStore?.name} />

      {state.step === 'store-selection' && (
        <StoreSelector
          stores={state.availableStores}
          selectedStore={state.selectedStore}
          onSelect={handleStoreSelect}
          onRecreate={handleStoreRecreate}
          onRemove={handleStoreRemove}
          onNext={handleNext}
          onCancel={handleCancel}
        />
      )}

      {state.step === 'plot-configuration' && state.selectedStore && (
        <PlotConfig
          store={state.selectedStore}
          activeTab={state.plotTab}
          selectedPlot={state.selectedPlot}
          newPlotForm={state.newPlotForm}
          onTabChange={handleTabChange}
          onPlotSelect={handlePlotSelect}
          onNewPlotNameChange={handleNewPlotNameChange}
          onNewPlotDescriptionChange={handleNewPlotDescriptionChange}
          onBack={handleBack}
          onCancel={handleCancel}
          onLoad={handleLoad}
        />
      )}

      {state.step === 'processing' && (
        <ProgressView progress={state.progress} statusMessage={state.statusMessage} />
      )}

      {state.step === 'complete' && state.result && <SuccessView result={state.result} />}

      {state.step === 'error' && state.error && (
        <ErrorView error={state.error} onRetry={state.error.retryable ? handleRetry : undefined} />
      )}
    </div>
  );
}
