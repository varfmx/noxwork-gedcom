import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/useUserStore';

const LANGS = ['en', 'es'] as const;
type Lang = (typeof LANGS)[number];

const LABELS: Record<Lang, string> = { en: 'EN', es: 'ES' };
const FLAGS: Record<Lang, string>  = { en: '🇺🇸', es: '🇲🇽' };

/**
 * LanguageSwitcher — minimal EN / ES toggle for the Noxwork navbar.
 *
 * On change:
 *  1. Updates i18next (triggers re-render of all translated strings)
 *  2. Persists to localStorage via the LanguageDetector plugin
 *  3. PATCHes /api/users/me so the preference is stored in the DB
 *     and synced across devices on the next login.
 */
export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const updateLanguage = useUserStore((s) => s.updateLanguage);

    const current = (LANGS.includes(i18n.language as Lang) ? i18n.language : 'en') as Lang;

    const toggle = () => {
        const next: Lang = current === 'en' ? 'es' : 'en';
        void updateLanguage(next);
    };

    return (
        <button
            onClick={toggle}
            title={`Switch to ${current === 'en' ? 'Español' : 'English'}`}
            className="
                flex items-center gap-1.5
                px-2.5 py-1 rounded-lg
                border border-nox-surface-lighter
                text-nox-text-muted hover:text-nox-text
                hover:border-nox-cobalt/50 hover:bg-nox-cobalt/5
                transition-all duration-200
                text-xs font-semibold select-none
            "
        >
            <span>{FLAGS[current]}</span>
            {LANGS.map((lang) => (
                <span
                    key={lang}
                    className={lang === current ? 'text-nox-text font-bold' : 'text-nox-text-muted'}
                >
                    {LABELS[lang]}
                    {lang !== LANGS[LANGS.length - 1] && (
                        <span className="text-nox-surface-lighter mx-0.5">|</span>
                    )}
                </span>
            ))}
        </button>
    );
}
