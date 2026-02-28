import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

/**
 * AuthCallback — Handles redirects from Supabase Auth:
 *
 *  1. OAuth (Google SSO): Exchanges hash tokens → navigate /dashboard
 *  2. Email confirmation: User clicks link in signup email → /dashboard
 *  3. Password recovery: User clicks reset-password email → /update-password
 *
 * Supabase appends a URL fragment with `#access_token=...&type=recovery|signup`
 * which the SDK parses automatically via onAuthStateChange.
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const setSession = useAuthStore((s) => s.setSession);

    useEffect(() => {
        // Listen for the auth event triggered by the hash fragment
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // Password reset link — send user to update-password form
                setSession(session);
                navigate('/update-password', { replace: true });
            } else if (session) {
                // SIGNED_IN (OAuth or email confirmation)
                setSession(session);
                navigate('/dashboard', { replace: true });
            }
        });

        // Fallback: if the auth state already resolved before we subscribed
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setSession(data.session);
                navigate('/dashboard', { replace: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, setSession]);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-nox-surface">
            <div className="flex flex-col items-center gap-4">
                {/* Spinner */}
                <div className="w-10 h-10 rounded-full border-2 border-nox-cobalt border-t-transparent animate-spin" />
                <p className="text-nox-text-muted text-sm">Signing you in…</p>
            </div>
        </div>
    );
}

