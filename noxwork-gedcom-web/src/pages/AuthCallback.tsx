import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

/**
 * AuthCallback — Handles the OAuth redirect from Supabase / Google.
 *
 * Supabase appends a `#access_token=...&refresh_token=...` fragment to the
 * redirect URL. The Supabase client automatically picks this up when the page
 * loads and calls `onAuthStateChange`, which useAuthStore already subscribes
 * to. We just need to wait for the session to be confirmed, then navigate.
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const setSession = useAuthStore((s) => s.setSession);

    useEffect(() => {
        // Supabase exchanges the hash fragment tokens and resolves the session
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            navigate('/dashboard', { replace: true });
        });
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
