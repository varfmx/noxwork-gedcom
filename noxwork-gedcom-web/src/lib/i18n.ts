/**
 * i18n.ts — Noxwork GEDCOM internationalization configuration.
 *
 * Languages supported:  English ("en") · Spanish ("es")
 * Persistence:          LanguageDetector reads from localStorage key "noxwork_lang",
 *                       then navigator.language, then falls back to "en".
 * Namespace:            Single "translation" namespace with sections:
 *                       common.* · dashboard.* · visualizer.* · auth.*
 *
 * Usage in components:
 *   const { t, i18n } = useTranslation();
 *   t('dashboard.nav.newTree')
 *   t('dashboard.projects.subtitle', { count: 5 })  // uses _one/_other suffixes
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en/translation.json';
import esTranslation from '../locales/es/translation.json';

const resources = {
    en: { translation: enTranslation },
    es: { translation: esTranslation },
} as const;

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: ['en', 'es'],

        // LanguageDetector order: localStorage → navigator → fallback
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'noxwork_lang',
            cacheUserLanguage: true,
        },

        interpolation: {
            // React already escapes values
            escapeValue: false,
        },

        // Enable count-based pluralisation:
        //   "subtitle_one" / "subtitle_other" — handled automatically
        pluralSeparator: '_',
    });

export default i18n;
