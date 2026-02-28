import { create } from 'zustand';
import { getAccessToken } from '../lib/supabase';
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
            set({ profile: json.data, isLoadingProfile: false });
        } catch {
            // Profile enrichment is best-effort — don't block the UI
            set({ isLoadingProfile: false });
        }
    },

    clearProfile: () => set({ profile: null }),
}));
