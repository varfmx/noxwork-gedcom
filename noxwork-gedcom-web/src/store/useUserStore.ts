import { create } from 'zustand';
import { getAccessToken } from '../lib/supabase';
import i18n from '../lib/i18n';
import type { UserProfile } from '../types/api';

/* ─── Constants ──────────────────────────────────────────────── */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)
    ? `${import.meta.env.VITE_API_URL as string}/api`
    : '/api';

/* ─── State shape ────────────────────────────────────────────── */

interface UserState {
    profile: UserProfile | null;
    isLoadingProfile: boolean;

    fetchProfile: () => Promise<void>;
    /**
     * Changes the UI language, persists to localStorage (via i18next LanguageDetector)
     * and syncs to the Prisma DB via PATCH /api/users/me.
     */
    updateLanguage: (lang: string) => Promise<void>;
    clearProfile: () => void;
}

/* ─── Store ──────────────────────────────────────────────────── */

export const useUserStore = create<UserState>((set) => ({
    profile: null,
    isLoadingProfile: false,

    /**
     * Fetches the authenticated user's Prisma profile from GET /api/users/me.
     *
     * The endpoint is backed by UserSyncService, so the row is guaranteed to
     * exist after the first JWT validation. Safe to call on every session init.
     */
    fetchProfile: async () => {
        set({ isLoadingProfile: true });
        try {
            const token = await getAccessToken();
            if (!token) {
                set({ isLoadingProfile: false });
                return;
            }

            const res = await fetch(`${API_BASE}/users/me`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json() as { success: boolean; data: UserProfile };
            const profile = json.data;

            // Sync language: DB preference wins over localStorage on login
            if (profile.language && profile.language !== i18n.language) {
                void i18n.changeLanguage(profile.language);
            }

            set({ profile, isLoadingProfile: false });
        } catch {
            // Profile enrichment is best-effort — don't block the UI
            set({ isLoadingProfile: false });
        }
    },

    updateLanguage: async (lang: string) => {
        // 1. Update i18next immediately (re-renders all translated strings).
        //    LanguageDetector automatically writes to localStorage 'noxwork_lang'.
        void i18n.changeLanguage(lang);

        // 2. Optimistically update local profile state
        set((s) => s.profile ? { profile: { ...s.profile, language: lang } } : {});

        // 3. Persist to DB — best-effort, never throws
        try {
            const token = await getAccessToken();
            if (!token) return;
            await fetch(`${API_BASE}/users/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ language: lang }),
            });
        } catch { /* best-effort */ }
    },

    clearProfile: () => set({ profile: null }),
}));
