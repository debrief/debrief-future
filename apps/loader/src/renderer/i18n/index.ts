/**
 * Internationalization configuration.
 * Uses react-i18next with TypeScript key extraction.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Type-safe translation keys
export type TranslationKeys = keyof typeof en;

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnNull: false,
});

export default i18n;
