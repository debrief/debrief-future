/**
 * Zod schemas for runtime validation.
 */

import { z } from 'zod';

/**
 * Schema for a registered STAC store.
 */
export const StoreRegistrationSchema = z.object({
  path: z.string().min(1, 'Path cannot be empty'),
  name: z.string().min(1, 'Name cannot be empty'),
  lastAccessed: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
  notes: z.string().optional(),
});

/**
 * Schema for preference values (string, number, boolean, or null).
 */
export const PreferenceValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

/**
 * Schema for the root configuration object.
 */
export const ConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be a valid semver version'),
  stores: z.array(StoreRegistrationSchema),
  preferences: z.record(PreferenceValueSchema),
});

/**
 * Type inference from schemas.
 */
export type StoreRegistrationInput = z.infer<typeof StoreRegistrationSchema>;
export type ConfigInput = z.infer<typeof ConfigSchema>;
