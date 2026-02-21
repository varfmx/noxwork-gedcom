import { create } from 'zustand';
import {
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import type {
    PersonNodeData,
    UploadResponse,
    ApiIndividual,
    ApiFamily,
} from '../types/api';

/* ─── Constants ──────────────────────────────────────────────── */

const API_BASE = '/api';
const GRID_COLS = 4;
const NODE_SPACING_X = 320;
const NODE_SPACING_Y = 220;

/* ─── Store Interface ────────────────────────────────────────── */

interface TreeState {
    nodes: Node<PersonNodeData>[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
    sessionId: string | null;
    stats: { individualsCount: number; familiesCount: number } | null;

    // Actions
    uploadAndParse: (fileContent: string, fileName?: string) => Promise<void>;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    applyLayout: () => void;
    reset: () => void;
}

/* ─── Data Mapping ───────────────────────────────────────────── */

function mapIndividualsToNodes(
    individuals: ApiIndividual[],
): Node<PersonNodeData>[] {
    return individuals.map((person, index) => {
        const col = index % GRID_COLS;
        const row = Math.floor(index / GRID_COLS);

        return {
            id: person.id,
            type: 'person',
            position: { x: col * NODE_SPACING_X, y: row * NODE_SPACING_Y },
            data: {
                label: person.fullName,
                fullName: person.fullName,
                givenName: person.givenName,
                surname: person.surname,
                sex: person.sex,
                birthDate: person.birthDate,
                deathDate: person.deathDate,
                birthPlace: person.birthPlace,
                detectedRoles: person.detectedRoles ?? [],
                gedcomId: person.id,
            },
        };
    });
}

function mapFamiliesToEdges(
    families: ApiFamily[],
    individuals: ApiIndividual[],
): Edge[] {
    const edges: Edge[] = [];
    const individualIds = new Set(individuals.map((i) => i.id));

    for (const family of families) {
        // Spouse edge: husband ↔ wife (dashed, orange)
        if (
            family.husbandId &&
            family.wifeId &&
            individualIds.has(family.husbandId) &&
            individualIds.has(family.wifeId)
        ) {
            edges.push({
                id: `spouse-${family.id}`,
                source: family.husbandId,
                target: family.wifeId,
                type: 'default',
                animated: false,
                style: {
                    stroke: '#FF8C00',
                    strokeWidth: 2,
                    strokeDasharray: '6 3',
                },
                label: '♥',
            });
        }

        // Parent → Child edges (solid, cobalt)
        const parentIds = [family.husbandId, family.wifeId].filter(
            (id): id is string => id !== null && individualIds.has(id),
        );

        for (const childId of family.childrenIds) {
            if (!individualIds.has(childId)) continue;

            // Connect from the first available parent
            const sourceParent = parentIds[0];
            if (sourceParent) {
                edges.push({
                    id: `child-${family.id}-${sourceParent}-${childId}`,
                    source: sourceParent,
                    target: childId,
                    type: 'default',
                    animated: false,
                    style: {
                        stroke: '#0047AB',
                        strokeWidth: 2,
                    },
                });
            }
        }
    }

    return edges;
}

/* ─── Zustand Store ──────────────────────────────────────────── */

export const useTreeStore = create<TreeState>((set, get) => ({
    nodes: [],
    edges: [],
    isLoading: false,
    error: null,
    sessionId: null,
    stats: null,

    uploadAndParse: async (fileContent: string, fileName?: string) => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch(`${API_BASE}/gedcom/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileContent, fileName }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result: UploadResponse = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }

            const nodes = mapIndividualsToNodes(result.data.individuals);
            const edges = mapFamiliesToEdges(
                result.data.families,
                result.data.individuals,
            );

            set({
                nodes,
                edges,
                sessionId: result.data.sessionId,
                stats: result.data.stats,
                isLoading: false,
                error: null,
            });

            // Auto-apply layout after loading
            get().applyLayout();
        } catch (err) {
            set({
                isLoading: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    },

    onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    /**
     * Placeholder for automatic layout (Dagre / ELK).
     * Currently uses simple grid positioning.
     * TODO: Integrate dagre or elkjs for hierarchical layout.
     */
    applyLayout: () => {
        const { nodes } = get();
        const layouted = nodes.map((node, index) => {
            const col = index % GRID_COLS;
            const row = Math.floor(index / GRID_COLS);
            return {
                ...node,
                position: { x: col * NODE_SPACING_X, y: row * NODE_SPACING_Y },
            };
        });
        set({ nodes: layouted });
    },

    reset: () => {
        set({
            nodes: [],
            edges: [],
            isLoading: false,
            error: null,
            sessionId: null,
            stats: null,
        });
    },
}));
