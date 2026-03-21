import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/Toast';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useThemeStore } from '../store/useThemeStore';

/**
 * ForgotPassword — Sends a password reset email via Supabase Auth.
 *
 * Flow:
 *   User enters email → supabase.auth.resetPasswordForEmail()
 *   → Supabase sends email with link → link redirects to /update-password
 */
export default function ForgotPassword() {
    const { resetPasswordForEmail } = useAuthStore();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const { mode } = useThemeStore();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsSubmitting(true);

        const result = await resetPasswordForEmail(email.trim().toLowerCase());

        if (result.error) {
            addToast(result.error, 'error');
        } else {
            setSent(true);
            addToast(t('auth.toast.resetSent'), 'success');
        }
        setIsSubmitting(false);
    };

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
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <img
                            src={mode === 'light' ? '/radixflow_blue.png' : '/radixflow_white.png'}
                            alt="RadixFlow"
                            className="h-20 w-auto object-contain drop-shadow-lg"
                        />
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-nox-text tracking-tight">
                                {t('auth.resetPassword')}
                            </h1>
                            <p className="text-xs text-nox-text-muted mt-0.5">
                                {t('auth.resetPasswordSubtitle')}
                            </p>
                        </div>
                    </div>

                    {sent ? (
                        /* ── Success state ── */
                        <div className="flex flex-col items-center gap-4 py-2">
                            <div className="w-14 h-14 rounded-full bg-nox-orange/10 border border-nox-orange/30 flex items-center justify-center">
                                <svg className="w-7 h-7 text-nox-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                            </div>
                            <p className="text-sm text-nox-text text-center leading-relaxed">
                                {t('auth.checkEmailMsg', { email })}
                            </p>
                            <p className="text-xs text-nox-text-muted text-center">
                                {t('auth.spamTip')}{' '}
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-nox-orange hover:underline font-medium"
                                >
                                    {t('auth.tryAgain')}
                                </button>
                                .
                            </p>
                        </div>
                    ) : (
                        /* ── Email form ── */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-nox-text-muted uppercase tracking-wider block mb-1.5">
                                    {t('auth.emailAddress')}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                    className="
                                        w-full bg-nox-surface border border-nox-surface-lighter rounded-xl
                                        px-4 py-2.5 text-sm text-nox-text placeholder:text-nox-text-muted
                                        focus:outline-none focus:ring-2 focus:ring-nox-orange/40 focus:border-nox-orange
                                        transition-all
                                    "
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!email.trim() || isSubmitting}
                                className="
                                    w-full py-2.5 rounded-xl text-sm font-semibold
                                    bg-nox-orange hover:bg-nox-orange-dark text-white
                                    shadow-lg shadow-nox-orange/20
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all duration-200
                                "
                            >
                                {isSubmitting ? t('auth.sending') : t('auth.sendResetLink')}
                            </button>
                        </form>
                    )}

                    {/* Back to login */}
                    <p className="text-center text-xs text-nox-text-muted mt-6">
                        {t('auth.rememberPassword')}{' '}
                        <Link
                            to="/login"
                            className="text-nox-cobalt-light hover:underline font-medium"
                        >
                            {t('auth.signInLink')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
