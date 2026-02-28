import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/* ─── State shape ────────────────────────────────────────────── */

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;

    // Actions
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    setSession: (session: Session | null) => void;
    initialize: () => Promise<void>;
}

/* ─── Store ──────────────────────────────────────────────────── */

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,

    /**
     * Kicks off the Supabase Google OAuth flow.
     * Supabase redirects the browser to Google, then back to
     * `{VITE_SUPABASE_URL}/auth/v1/callback?next=/auth/callback`
     * which we handle in <AuthCallback />.
     */
    signInWithGoogle: async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    // Request offline access so Supabase can refresh tokens
                    access_type: 'offline',
                    prompt: 'select_account',
                },
            },
        });
    },

    /**
     * Signs the user out and clears local session state.
     */
    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
    },

    /**
     * Called by <AuthCallback /> and the auth state listener.
     */
    setSession: (session) =>
        set({ session, user: session?.user ?? null, isLoading: false }),

    /**
     * Must be called once at app startup (inside main.tsx or a top-level
     * useEffect) to rehydrate the session from Supabase's local storage.
     */
    initialize: async () => {
        try {
            const { data } = await supabase.auth.getSession();
            set({
                session: data.session,
                user: data.session?.user ?? null,
                isLoading: false,
            });

            // Subscribe to auth changes (token refresh, sign-out, etc.)
            supabase.auth.onAuthStateChange((_event, session) => {
                set({ session, user: session?.user ?? null });
            });
        } catch {
            set({ isLoading: false });
        }
    },
}));
