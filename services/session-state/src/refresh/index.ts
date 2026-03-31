/**
 * Auto-Refresh module — public API.
 * Feature: 089-result-auto-refresh (E04)
 */

export type {
  AutoRefreshStatus,
  AutoRefreshState,
  ViewportState,
  RefreshCallback,
  RefreshEvent,
  AutoRefreshController,
  AutoRefreshControllerOptions,
} from './types.js';

export { createAutoRefreshController } from './controller.js';
