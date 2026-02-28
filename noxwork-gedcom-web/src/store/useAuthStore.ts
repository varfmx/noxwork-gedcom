import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/* ─── State shape ────────────────────────────────────────────── */

interface AuthResult {
    error?: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;

    // Actions
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
    signUpWithEmail: (email: string, password: string, firstName: string, lastName: string) => Promise<AuthResult>;
    resetPasswordForEmail: (email: string) => Promise<AuthResult>;
    updatePassword: (password: string) => Promise<AuthResult>;
    resendConfirmation: (email: string) => Promise<AuthResult>;
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
     * Sign in with email and password.
     */
    signInWithEmail: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
    },

    /**
     * Register a new user with email, password and display name.
     * `first_name` / `last_name` are stored in `user_metadata` so that
     * the backend UserSyncService can persist them in the Prisma User table
     * on the very first authenticated request.
     *
     * Supabase sends a confirmation email — unconfirmed users have
     * `user.email_confirmed_at === null`.
     */
    signUpWithEmail: async (email, password, firstName, lastName) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
                data: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                },
            },
        });
        if (error) return { error: error.message };
        return {};
    },

    /**
     * Sends a password reset email. The link in the email redirects to
     * `${window.location.origin}/update-password` where the user can
     * set a new password.
     */
    resetPasswordForEmail: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) return { error: error.message };
        return {};
    },

    /**
     * Updates the authenticated user's password.
     * Must be called after the user has been authenticated via the
     * password-reset link (PASSWORD_RECOVERY event).
     */
    updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { error: error.message };
        return {};
    },

    /**
     * Resends the signup confirmation email for users who didn't receive it.
     */
    resendConfirmation: async (email) => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) return { error: error.message };
        return {};
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
