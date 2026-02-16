/**
 * @file index.ts
 * @description Barrel export for format module (Feature 097).
 */

export { getEditableProperties, hasEditableProperties, STYLE_PROPERTY_MAP } from './stylePropertyMap.js';
export type { StylePropertyDescriptor, ValueType, PropertyCategory } from './stylePropertyMap.js';
export { createFormatService } from './formatService.js';
export type { FormatService, FormatServiceDeps, FormatChangeRequest, FormatChangeResult, FormatMenuItem } from './formatService.js';
