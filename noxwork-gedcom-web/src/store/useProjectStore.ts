import { create } from 'zustand';
import { getAccessToken } from '../lib/supabase';
import type { ProjectSummary } from '../types/api';

/* ─── Constants ──────────────────────────────────────────────── */

// In dev the Vite proxy rewrites /api → http://localhost:3000 so no env var needed.
// In production (Vercel) set VITE_API_URL to your deployed backend URL.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)
    ? `${import.meta.env.VITE_API_URL as string}/api`
    : '/api';

/* ─── State shape ────────────────────────────────────────────── */

interface ProjectState {
    projects: ProjectSummary[];
    isLoading: boolean;
    error: string | null;

    // Active project for visualizer navigation
    activeProjectId: string | null;

    // Actions
    fetchProjects: () => Promise<void>;
    createProject: (name: string, description?: string) => Promise<ProjectSummary | null>;
    deleteProject: (id: string) => Promise<void>;
    renameProject: (id: string, name: string) => Promise<void>;
    duplicateProject: (id: string) => Promise<void>;
    setActiveProject: (id: string | null) => void;
    touchProject: (id: string) => void;
    clearError: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────── */

async function authHeaders(): Promise<HeadersInit> {
    const token = await getAccessToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/* ─── Store ──────────────────────────────────────────────────── */

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    isLoading: false,
    error: null,
    activeProjectId: null,

    /* ── GET /api/projects ───────────────────────────────────── */

    fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                headers: await authHeaders(),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json() as { success: boolean; data: ProjectSummary[] };
            set({ projects: json.data, isLoading: false });
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Failed to load projects',
                isLoading: false,
            });
        }
    },

    /* ── POST /api/projects ──────────────────────────────────── */

    createProject: async (name, description) => {
        set({ error: null });
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: await authHeaders(),
                body: JSON.stringify({ name, description }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json() as { success: boolean; data: ProjectSummary };
            set((s) => ({ projects: [json.data, ...s.projects] }));
            return json.data;
        } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to create project' });
            return null;
        }
    },

    /* ── DELETE /api/projects/:id ────────────────────────────── */

    deleteProject: async (id) => {
        // Optimistic update
        const snapshot = get().projects;
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));

        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, {
                method: 'DELETE',
                headers: await authHeaders(),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (err) {
            // Rollback
            set({ projects: snapshot, error: err instanceof Error ? err.message : 'Failed to delete project' });
        }
    },

    /* ── PATCH /api/projects/:id ─────────────────────────────── */

    renameProject: async (id, name) => {
        const snapshot = get().projects;
        // Optimistic update
        set((s) => ({
            projects: s.projects.map((p) =>
                p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p,
            ),
        }));

        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, {
                method: 'PATCH',
                headers: await authHeaders(),
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json() as { success: boolean; data: ProjectSummary };
            set((s) => ({
                projects: s.projects.map((p) => (p.id === id ? json.data : p)),
            }));
        } catch (err) {
            set({ projects: snapshot, error: err instanceof Error ? err.message : 'Failed to rename project' });
        }
    },

    /* ── Duplicate (POST new project + copy metadata) ────────── */

    duplicateProject: async (id) => {
        const original = get().projects.find((p) => p.id === id);
        if (!original) return;
        await get().createProject(`${original.name} (copy)`, original.description ?? undefined);
    },

    /* ── Helpers ─────────────────────────────────────────────── */

    setActiveProject: (id) => set({ activeProjectId: id }),

    /** Optimistically update a project's updatedAt to "now" */
    touchProject: (id) =>
        set((s) => ({
            projects: s.projects.map((p) =>
                p.id === id ? { ...p, updatedAt: new Date().toISOString() } : p,
            ),
        })),

    clearError: () => set({ error: null }),
}));
