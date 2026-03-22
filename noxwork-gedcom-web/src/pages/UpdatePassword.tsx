import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/Toast';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useThemeStore } from '../store/useThemeStore';

/* ─── Validation ─────────────────────────────────────────────── */

interface PasswordStrength {
    score: number;          // 0-5
    labelKey: string;
    color: string;
}

function validatePassword(password: string): string | null {
    if (password.length < 8)              return 'auth.validation.minLength';
    if (!/[A-Z]/.test(password))          return 'auth.validation.uppercase';
    if (!/[a-z]/.test(password))          return 'auth.validation.lowercase';
    if (!/[0-9]/.test(password))          return 'auth.validation.number';
    if (!/[^A-Za-z0-9]/.test(password))   return 'auth.validation.special';
    return null;
}

function getPasswordStrength(password: string): PasswordStrength {
    if (!password) return { score: 0, labelKey: '', color: '' };
    let score = 0;
    if (password.length >= 8)             score++;
    if (password.length >= 12)            score++;
    if (/[A-Z]/.test(password))           score++;
    if (/[0-9]/.test(password))           score++;
    if (/[^A-Za-z0-9]/.test(password))   score++;

    if (score <= 2) return { score, labelKey: 'auth.strength.weak',   color: 'bg-nox-danger' };
    if (score === 3) return { score, labelKey: 'auth.strength.fair',   color: 'bg-nox-warning' };
    if (score === 4) return { score, labelKey: 'auth.strength.good',   color: 'bg-nox-cobalt-light' };
    return              { score, labelKey: 'auth.strength.strong', color: 'bg-nox-orange' };
}

/* ─── Component ──────────────────────────────────────────────── */

/**
 * UpdatePassword — Allows a user arriving via a password-reset email link
 * to set a new password.
 *
 * Supabase fires a PASSWORD_RECOVERY auth event when the hash fragment is
 * detected, which establishes a temporary session. We listen for this event
 * and only enable the form once the session is confirmed.
 */
export default function UpdatePassword() {
    const navigate = useNavigate();
    const { updatePassword } = useAuthStore();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const { mode } = useThemeStore();

    const [sessionReady, setSessionReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const strength = getPasswordStrength(password);

    /* ── Wait for Supabase to exchange the recovery token ── */
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
                setSessionReady(true);
            }
        });

        // Also handle the case where session is already set (page reload)
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) setSessionReady(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    /* ── Validate on every keystroke ── */
    useEffect(() => {
        if (!password) {
            setValidationError(null);
            return;
        }
        setValidationError(validatePassword(password));
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const err = validatePassword(password);
        if (err) {
            setValidationError(err);
            return;
        }
        if (password !== confirm) {
            addToast(t('auth.passwordsMismatch'), 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await updatePassword(password);

        if (result.error) {
            addToast(result.error, 'error');
        } else {
            addToast(t('auth.toast.passwordUpdated'), 'success');
            setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        }
        setIsSubmitting(false);
    };

    /* ── Waiting for recovery token ── */
    if (!sessionReady) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-nox-surface">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-nox-orange border-t-transparent animate-spin" />
                    <p className="text-nox-text-muted text-sm">{t('auth.verifyingLink')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-nox-surface px-4">
            {/* Background grid */}
            <div
                className="pointer-events-none fixed inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Language switcher */}
            <div className="fixed top-4 right-4 z-10">
                <LanguageSwitcher />
            </div>

            <div className="relative w-full max-w-sm">
                {/* Glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-nox-cobalt/30 to-nox-orange/20 blur-xl" />

                <div className="relative bg-nox-surface-light border border-nox-surface-lighter rounded-2xl p-8 shadow-2xl">
                    {/* Logo + Header */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <img
                            src={mode === 'light' ? '/radixflow_blue.png' : '/radixflow_white.png'}
                            alt="RadixFlow"
                            className="h-28 w-auto object-contain drop-shadow-lg"
                        />
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-nox-text tracking-tight">
                                {t('auth.newPassword')}
                            </h1>
                            <p className="text-xs text-nox-text-muted mt-0.5">
                                {t('auth.newPasswordSubtitle')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Password field */}
                        <div>
                            <label className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                                {t('auth.newPasswordLabel')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('auth.passwordPlaceholder')}
                                    autoFocus
                                    className={`
                                        w-full bg-nox-surface border rounded-xl
                                        px-4 py-2.5 pr-10 text-sm text-nox-text placeholder:text-nox-text-muted
                                        focus:outline-none focus:ring-2 transition-all
                                        ${validationError && password
                                            ? 'border-nox-danger focus:ring-nox-danger/30 focus:border-nox-danger'
                                            : 'border-nox-surface-lighter focus:ring-nox-orange/40 focus:border-nox-orange'}
                                    `}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nox-text-muted hover:text-nox-text transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Strength bar */}
                            {password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <div
                                                key={n}
                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                                    n <= strength.score ? strength.color : 'bg-nox-surface-lighter'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-[11px] font-medium ${
                                        strength.score <= 2 ? 'text-nox-danger' :
                                        strength.score === 3 ? 'text-nox-warning' :
                                        strength.score === 4 ? 'text-nox-cobalt-light' :
                                        'text-nox-orange'
                                    }`}>
                                        {strength.labelKey ? t(strength.labelKey) : ''}
                                    </p>
                                </div>
                            )}

                            {/* Inline error */}
                            {validationError && password && (
                                <p className="mt-1.5 text-xs text-nox-danger">{t(validationError)}</p>
                            )}
                        </div>

                        {/* Confirm password */}
                        <div>
                            <label className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                                {t('auth.confirmPassword')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder={t('auth.confirmPasswordPlaceholder')}
                                    className={`
                                        w-full bg-nox-surface border rounded-xl
                                        px-4 py-2.5 pr-10 text-sm text-nox-text placeholder:text-nox-text-muted
                                        focus:outline-none focus:ring-2 transition-all
                                        ${confirm && password !== confirm
                                            ? 'border-nox-danger focus:ring-nox-danger/30 focus:border-nox-danger'
                                            : 'border-nox-surface-lighter focus:ring-nox-orange/40 focus:border-nox-orange'}
                                    `}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nox-text-muted hover:text-nox-text transition-colors"
                                    tabIndex={-1}
                                >
                                    {showConfirm ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {confirm && password !== confirm && (
                                <p className="mt-1.5 text-xs text-nox-danger">{t('auth.passwordsMismatch')}</p>
                            )}
                        </div>

                        {/* Requirements list */}
                        <ul className="text-[11px] text-nox-text-muted space-y-1 pl-1">
                            {[
                                { test: password.length >= 8,           label: t('auth.requirements.chars') },
                                { test: /[A-Z]/.test(password),          label: t('auth.requirements.uppercase') },
                                { test: /[a-z]/.test(password),          label: t('auth.requirements.lowercase') },
                                { test: /[0-9]/.test(password),          label: t('auth.requirements.number') },
                                { test: /[^A-Za-z0-9]/.test(password),   label: t('auth.requirements.special') },
                            ].map(({ test, label }) => (
                                <li key={label} className={`flex items-center gap-1.5 transition-colors ${test ? 'text-nox-orange' : ''}`}>
                                    <span>{test ? '✓' : '·'}</span>
                                    {label}
                                </li>
                            ))}
                        </ul>

                        <button
                            type="submit"
                            disabled={
                                isSubmitting ||
                                !!validationError ||
                                !password ||
                                password !== confirm
                            }
                            className="
                                w-full py-2.5 rounded-xl text-sm font-semibold
                                bg-nox-orange hover:bg-nox-orange-dark text-white
                                shadow-lg shadow-nox-orange/20
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200
                            "
                        >
                            {isSubmitting ? t('auth.updating') : t('auth.setNewPassword')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
