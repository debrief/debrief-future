/**
 * Track manipulation tools barrel file.
 *
 * Exports tool definitions and execute stubs for all track manipulation tools.
 * These are consumed by the TypeScript tool registry for web-shell and
 * by the VS Code extension when the Python backend is unavailable.
 */

import type { MCPToolDefinition } from '../../../types/tool';
import { toolDefinition as generateCoursesSpeedsDefinition } from './generateCoursesSpeeds';

export { generateCoursesSpeedsDefinition };

/** All manipulation tool definitions */
export const allManipulationToolDefinitions: MCPToolDefinition[] = [
  generateCoursesSpeedsDefinition,
];
