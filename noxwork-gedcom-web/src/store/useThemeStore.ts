import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─── Types ──────────────────────────────────────────────────── */

export type ThemeMode = 'dark' | 'light';

interface ThemeState {
    mode: ThemeMode;
    toggle: () => void;
    setMode: (mode: ThemeMode) => void;
}

/* ─── Store ──────────────────────────────────────────────────── */

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: 'dark',

            toggle: () => {
                const next = get().mode === 'dark' ? 'light' : 'dark';
                set({ mode: next });
                applyThemeToDOM(next);
            },

            setMode: (mode) => {
                set({ mode });
                applyThemeToDOM(mode);
            },
        }),
        {
            name: 'noxwork-theme',
            onRehydrateStorage: () => (state) => {
                if (state) applyThemeToDOM(state.mode);
            },
        },
    ),
);

/* ─── DOM helper ─────────────────────────────────────────────── */

function applyThemeToDOM(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
    } else {
        root.classList.add('dark');
        root.classList.remove('light');
    }
}
