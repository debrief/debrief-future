/**
 * Parameter validation for replay tuning.
 * Feature: 076-replay-tune
 */

import type { ParameterTypeInfo } from './types.js';

export interface ValidationResult {
  valid: boolean;
  message: string | null;
}

/**
 * Parse ISO 8601 duration string to check validity.
 * Accepts durations with PT prefix, e.g., PT30S, PT1M, PT1H30M, PT1H30M15S.
 */
export function isValidIsoDuration(value: string): boolean {
  if (typeof value !== 'string') return false;
  // Match PT followed by optional hours, optional minutes, optional seconds
  // At least one component must be present after PT
  const pattern = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
  const match = pattern.exec(value);
  if (!match) return false;
  // Ensure at least one component is present (not just "PT")
  const hasHours = match[1] !== undefined;
  const hasMinutes = match[2] !== undefined;
  const hasSeconds = match[3] !== undefined;
  return hasHours || hasMinutes || hasSeconds;
}

/** Validate a parameter value against its type info. */
export function validateParameter(
  value: unknown,
  typeInfo: ParameterTypeInfo
): ValidationResult {
  switch (typeInfo.type) {
    case 'float': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { valid: false, message: `${typeInfo.label} must be a finite number` };
      }
      if (typeInfo.min !== undefined && value < typeInfo.min) {
        return { valid: false, message: `${typeInfo.label} must be >= ${typeInfo.min}` };
      }
      if (typeInfo.max !== undefined && value > typeInfo.max) {
        return { valid: false, message: `${typeInfo.label} must be <= ${typeInfo.max}` };
      }
      return { valid: true, message: null };
    }

    case 'integer': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return { valid: false, message: `${typeInfo.label} must be an integer` };
      }
      if (typeInfo.min !== undefined && value < typeInfo.min) {
        return { valid: false, message: `${typeInfo.label} must be >= ${typeInfo.min}` };
      }
      if (typeInfo.max !== undefined && value > typeInfo.max) {
        return { valid: false, message: `${typeInfo.label} must be <= ${typeInfo.max}` };
      }
      return { valid: true, message: null };
    }

    case 'duration': {
      if (typeof value !== 'string') {
        return { valid: false, message: `${typeInfo.label} must be an ISO 8601 duration string` };
      }
      if (!isValidIsoDuration(value)) {
        return { valid: false, message: `${typeInfo.label} is not a valid ISO 8601 duration (e.g., PT30S, PT1M, PT1H30M)` };
      }
      return { valid: true, message: null };
    }

    case 'enum': {
      const allowed = typeInfo.allowedValues ?? [];
      if (!allowed.includes(String(value))) {
        return {
          valid: false,
          message: `${typeInfo.label} must be one of: ${allowed.join(', ')}`,
        };
      }
      return { valid: true, message: null };
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        return { valid: false, message: `${typeInfo.label} must be a boolean (true or false)` };
      }
      return { valid: true, message: null };
    }

    case 'string': {
      if (typeof value !== 'string') {
        return { valid: false, message: `${typeInfo.label} must be a string` };
      }
      if (value.length === 0) {
        return { valid: false, message: `${typeInfo.label} must not be empty` };
      }
      if (typeInfo.pattern !== undefined) {
        const regex = new RegExp(typeInfo.pattern);
        if (!regex.test(value)) {
          return { valid: false, message: `${typeInfo.label} does not match required pattern` };
        }
      }
      return { valid: true, message: null };
    }

    default:
      return { valid: false, message: `Unknown parameter type: ${(typeInfo as ParameterTypeInfo).type}` };
  }
}
