import { useAuthStore } from '../store/useAuthStore';

/**
 * LoginPage — Full-screen Noxwork branded login with Google SSO.
 */
export default function LoginPage() {
    const { signInWithGoogle, isLoading } = useAuthStore();

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

            {/* Card */}
            <div className="relative w-full max-w-sm">
                {/* Glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-nox-cobalt/30 to-nox-orange/20 blur-xl" />

                <div className="relative bg-nox-surface-light border border-nox-surface-lighter rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <img
                            src="/noxwork_logo_white.png"
                            alt="Noxwork"
                            className="h-14 w-auto object-contain drop-shadow-lg"
                        />
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-nox-text tracking-tight">
                                Noxwork GEDCOM
                            </h1>
                            <p className="text-xs text-nox-text-muted mt-0.5">
                                Genealogy Visualization Platform
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-nox-surface-lighter" />
                        <span className="text-[11px] text-nox-text-muted uppercase tracking-widest">
                            Sign in to continue
                        </span>
                        <div className="flex-1 h-px bg-nox-surface-lighter" />
                    </div>

                    {/* Google SSO Button */}
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
                            group
                        "
                    >
                        {/* Google Icon */}
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    {/* Footer note */}
                    <p className="text-center text-[11px] text-nox-text-muted mt-5 leading-relaxed">
                        By signing in you agree to the Noxwork{' '}
                        <span className="text-nox-cobalt-light cursor-pointer hover:underline">
                            Terms of Service
                        </span>
                        .
                    </p>
                </div>
            </div>

            {/* Bottom branding */}
            <p className="mt-8 text-[11px] text-nox-text-muted">
                © 2026 Noxwork Technologies — Engineering Innovation Labs
            </p>
        </div>
    );
}
