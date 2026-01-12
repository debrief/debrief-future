/**
 * Hook for executing the file load workflow.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SourceFile, LoadResult, LoaderError } from '../types';
import type { StacStoreInfo } from '../types/store';

interface LoadOptions {
  sourceFile: SourceFile;
  store: StacStoreInfo;
  mode: 'create' | 'existing';
  newPlotName?: string;
  newPlotDescription?: string;
  existingPlotId?: string;
  onProgress: (progress: number, message: string) => void;
}

interface UseLoadWorkflowResult {
  executeLoad: (options: LoadOptions) => Promise<LoadResult>;
}

/**
 * Executes the full load workflow:
 * 1. Parse file (debrief-io)
 * 2. Create plot or use existing (debrief-stac)
 * 3. Add features to plot (debrief-stac)
 * 4. Copy source file to assets (debrief-stac)
 */
export function useLoadWorkflow(): UseLoadWorkflowResult {
  const { t } = useTranslation();

  const executeLoad = useCallback(
    async (options: LoadOptions): Promise<LoadResult> => {
      const { sourceFile, store, mode, newPlotName, newPlotDescription, existingPlotId, onProgress } =
        options;

      // Generate operation ID for cleanup tracking
      const operationId = `load-${Date.now()}`;

      try {
        // Mark operation as pending
        await window.electronAPI.markOperationPending(operationId);

        // Step 1: Parse file (20%)
        onProgress(10, t('progress.parsing'));
        const parseResult = await window.electronAPI.parseFile(sourceFile.path);

        if (!parseResult.success || !parseResult.features) {
          throw new Error(parseResult.error?.message || t('errors.parseError'));
        }

        onProgress(20, t('progress.parsing'));

        // Step 2: Create or select plot (40%)
        let plotId: string;
        let plotName: string;

        if (mode === 'create') {
          onProgress(30, t('progress.creatingPlot'));
          const createResult = await window.electronAPI.createPlot(
            store.path,
            newPlotName || sourceFile.name,
            newPlotDescription
          );
          plotId = createResult.plotId;
          plotName = createResult.name;
        } else {
          if (!existingPlotId) {
            throw new Error('No plot selected');
          }
          plotId = existingPlotId;
          plotName = existingPlotId; // TODO: Get actual name from plot list
        }

        onProgress(40, t('progress.creatingPlot'));

        // Step 3: Add features (70%)
        onProgress(50, t('progress.addingFeatures'));
        const addResult = await window.electronAPI.addFeatures(
          store.path,
          plotId,
          parseResult.features,
          {
            sourcePath: sourceFile.path,
            sourceHash: parseResult.metadata.sourceHash,
            parser: parseResult.metadata.parser,
            parserVersion: parseResult.metadata.version,
            timestamp: parseResult.metadata.timestamp,
          }
        );

        onProgress(70, t('progress.addingFeatures'));

        // Step 4: Copy source file (90%)
        onProgress(80, t('progress.copyingAsset'));
        const copyResult = await window.electronAPI.copyAsset(
          store.path,
          plotId,
          sourceFile.path,
          'source-data'
        );

        onProgress(90, t('progress.copyingAsset'));

        // Step 5: Finalize (100%)
        onProgress(95, t('progress.finalizing'));

        // Clear pending operation marker
        await window.electronAPI.clearOperationPending(operationId);

        onProgress(100, t('progress.finalizing'));

        return {
          plotId,
          plotName,
          storeName: store.name,
          featuresLoaded: addResult.featuresAdded,
          assetPath: copyResult.assetPath,
          provenanceId: addResult.provenanceId,
        };
      } catch (err) {
        // Don't clear pending marker on error - let cleanup handle it
        throw err;
      }
    },
    [t]
  );

  return { executeLoad };
}
