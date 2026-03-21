import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/Toast';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useThemeStore } from '../store/useThemeStore';

/* ─── Auth mode ──────────────────────────────────────────────── */

type AuthMode = 'sign-in' | 'sign-up';

/**
 * LoginPage — Noxwork branded auth screen.
 *
 * Supports:
 *  - Google SSO (OAuth)
 *  - Email + Password sign-in / sign-up
 *  - Resend confirmation email (for unconfirmed accounts)
 */
export default function LoginPage() {
    const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resendConfirmation, isLoading } =
        useAuthStore();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { mode: themeMode } = useThemeStore();

    useEffect(() => {
        if (user && !isLoading) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, isLoading, navigate]);

    const [mode, setMode] = useState<AuthMode>('sign-in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [emailJustRegistered, setEmailJustRegistered] = useState<string | null>(null);

    /* ── Email/Password submit ── */
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) return;
        setIsSubmitting(true);

        if (mode === 'sign-in') {
            const result = await signInWithEmail(email.trim().toLowerCase(), password);
            if (result.error) {
                addToast(result.error, 'error');
            } else {
                navigate('/dashboard', { replace: true });
            }
        } else {
            const result = await signUpWithEmail(email.trim().toLowerCase(), password, firstName, lastName);
            if (result.error) {
                addToast(result.error, 'error');
            } else {
                setEmailJustRegistered(email.trim().toLowerCase());
                addToast(t('auth.toast.accountCreated'), 'success');
            }
        }
        setIsSubmitting(false);
    };

    /* ── Resend confirmation ── */
    const handleResend = async () => {
        const target = emailJustRegistered ?? email.trim().toLowerCase();
        if (!target) {
            addToast(t('auth.toast.enterEmail'), 'warning');
            return;
        }
        setIsResending(true);
        const result = await resendConfirmation(target);
        if (result.error) {
            addToast(result.error, 'error');
        } else {
            addToast(t('auth.toast.confirmationResent'), 'success');
        }
        setIsResending(false);
    };

    const toggleMode = () => {
        setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
        setEmailJustRegistered(null);
        setPassword('');
        setFirstName('');
        setLastName('');
    };

    return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-nox-surface px-4">
            {/* Background grid decoration */}
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

            {/* Card */}
            <div className="relative w-full max-w-sm">
                {/* Glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-nox-cobalt/30 to-nox-orange/20 blur-xl" />

                <div className="relative bg-nox-surface-light border border-nox-surface-lighter rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4 mb-6">
                        <img
                            src={themeMode === 'light' ? '/radixflow_blue.png' : '/radixflow_white.png'}
                            alt="RadixFlow"
                            className="h-18 w-auto object-contain drop-shadow-lg"
                        />
                    </div>

                    {/* Mode tabs */}
                    <div className="flex rounded-xl bg-nox-surface/60 border border-nox-surface-lighter p-1 mb-6">
                        {(['sign-in', 'sign-up'] as AuthMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setEmailJustRegistered(null); }}
                                className={`
                                    flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                                    ${mode === m
                                        ? 'bg-nox-orange text-white shadow-md shadow-nox-orange/20'
                                        : 'text-nox-text-muted hover:text-nox-text'}
                                `}
                            >
                                {m === 'sign-in' ? t('auth.signIn') : t('auth.register')}
                            </button>
                        ))}
                    </div>

                    {/* ── Post-signup confirmation notice ── */}
                    {emailJustRegistered && (
                        <div className="mb-5 rounded-xl border border-nox-orange/40 bg-nox-orange/10 px-4 py-3">
                            <p className="text-xs text-nox-orange leading-relaxed text-center">
                                {t('auth.confirmationSentTo', { email: emailJustRegistered })}
                            </p>
                        </div>
                    )}

                    {/* ── Email form ── */}
                    <form onSubmit={handleEmailSubmit} className="space-y-3 mb-4">

                        {/* First / Last name — sign-up only */}
                        {mode === 'sign-up' && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder={t('auth.firstName')}
                                    required
                                    autoComplete="given-name"
                                    className="
                                        w-1/2 bg-nox-surface border border-nox-surface-lighter rounded-xl
                                        px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                        focus:outline-none focus:ring-2 focus:ring-nox-orange/40 focus:border-nox-orange
                                        transition-all
                                    "
                                />
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder={t('auth.lastName')}
                                    required
                                    autoComplete="family-name"
                                    className="
                                        w-1/2 bg-nox-surface border border-nox-surface-lighter rounded-xl
                                        px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                        focus:outline-none focus:ring-2 focus:ring-nox-orange/40 focus:border-nox-orange
                                        transition-all
                                    "
                                />
                            </div>
                        )}

                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('auth.emailAddress')}
                                required
                                autoComplete="email"
                                className="
                                    w-full bg-nox-surface border border-nox-surface-lighter rounded-xl
                                    px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                    focus:outline-none focus:ring-2 focus:ring-nox-orange/40 focus:border-nox-orange
                                    transition-all
                                "
                            />
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('auth.password')}
                                required
                                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                                className="
                                    w-full bg-nox-surface border border-nox-surface-lighter rounded-xl
                                    px-4 py-2.5 pr-10 text-sm text-nox-text placeholder:text-nox-text-muted
                                    focus:outline-none focus:ring-2 focus:ring-nox-orange/40 focus:border-nox-orange
                                    transition-all
                                "
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                tabIndex={-1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-nox-text-muted hover:text-nox-text transition-colors"
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

                        {/* Forgot password link (sign-in only) */}
                        {mode === 'sign-in' && (
                            <div className="flex justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-[11px] text-nox-text-muted hover:text-nox-orange transition-colors"
                                >
                                    {t('auth.forgotPassword')}
                                </Link>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                !email.trim() ||
                                !password ||
                                (mode === 'sign-up' && (!firstName.trim() || !lastName.trim())) ||
                                isSubmitting
                            }
                            className="
                                w-full py-2.5 rounded-xl text-sm font-semibold
                                bg-nox-orange hover:bg-nox-orange-dark text-white
                                shadow-lg shadow-nox-orange/20
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200
                            "
                        >
                            {isSubmitting
                                ? (mode === 'sign-in' ? t('auth.signingIn') : t('auth.creatingAccount'))
                                : (mode === 'sign-in' ? t('auth.signIn') : t('auth.createAccount'))}
                        </button>
                    </form>

                    {/* ── Resend confirmation ── */}
                    <div className="flex items-center justify-center mb-4">
                        <button
                            onClick={handleResend}
                            disabled={isResending}
                            className="text-[11px] text-nox-text-muted hover:text-nox-orange transition-colors disabled:opacity-50"
                        >
                            {isResending ? t('auth.resending') : t('auth.resendConfirmation')}
                        </button>
                    </div>

                    {/* ── Divider ── */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-nox-surface-lighter" />
                        <span className="text-[11px] text-nox-text-muted uppercase tracking-widest">{t('auth.or')}</span>
                        <div className="flex-1 h-px bg-nox-surface-lighter" />
                    </div>

                    {/* ── Google SSO Button ── */}
                    <button
                        onClick={signInWithGoogle}
                        disabled={isLoading}
                        className="
                            w-full flex items-center justify-center gap-3
                            bg-white hover:bg-gray-50
                            text-gray-800 font-medium text-sm
                            border border-gray-200
                            rounded-xl py-3 px-4
                            shadow-sm hover:shadow-md
                            transition-all duration-200
                            disabled:opacity-60 disabled:cursor-not-allowed
                        "
                    >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>{t('auth.continueWithGoogle')}</span>
                    </button>

                    {/* Footer */}
                    <p className="text-center text-[11px] text-nox-text-muted mt-5 leading-relaxed">
                        {mode === 'sign-in' ? (
                            <>
                                {t('auth.noAccount')}{' '}
                                <button onClick={toggleMode} className="text-nox-cobalt-light hover:underline font-medium">
                                    {t('auth.register')}
                                </button>
                            </>
                        ) : (
                            <>
                                {t('auth.hasAccount')}{' '}
                                <button onClick={toggleMode} className="text-nox-cobalt-light hover:underline font-medium">
                                    {t('auth.signInLink')}
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
