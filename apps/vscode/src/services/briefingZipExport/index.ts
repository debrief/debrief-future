/**
 * Barrel for the briefing-zip export core.
 *
 * The pure packing logic now lives in the shared `@debrief/briefing-export`
 * package (#273, FR-016) so the VS Code and web-shell hosts share one
 * implementation. This barrel re-exports it unchanged; the VS Code host
 * adapter (`createDefaultExportHostDeps` in
 * `apps/vscode/src/commands/exportStoryboardAsBriefingZip.ts`) wires the
 * orchestrator against the real VS Code APIs.
 */

export {
  scopeStoryboard,
  StoryboardNotFoundError,
  buildItemJson,
  computeTileCoverage,
  injectInlineData,
  assembleZip,
  tileKeyOf,
  fetchTiles,
  exportBriefingZip,
} from '@debrief/briefing-export';

export type {
  ScopedFeatureCollection,
  BriefingItemJson,
  StacItemMinimal,
  TileCoord,
  TileCoverageInput,
  TileCoverageOutput,
  InjectableInlineData,
  InjectionResult,
  ZipAssemblerInput,
  ZipAssemblerOutput,
  FetchTilesInput,
  FetchTilesOutput,
  ExportBriefingZipInput,
  ExportBriefingZipOutput,
  ExportDeps,
  BriefingConfigForExport,
} from '@debrief/briefing-export';
