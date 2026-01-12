/**
 * Type-safe translation hook wrapper.
 * Provides autocompletion for translation keys.
 */

import { useTranslation as useI18nTranslation } from 'react-i18next';

/**
 * Typed translation hook.
 * Use this instead of useTranslation directly for better TypeScript support.
 */
export function useTypedTranslation() {
  return useI18nTranslation();
}

export { useTranslation } from 'react-i18next';
