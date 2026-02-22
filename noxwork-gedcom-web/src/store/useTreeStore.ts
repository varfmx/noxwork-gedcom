import { create } from 'zustand';
import {
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import type {
    PersonNodeData,
    UploadResponse,
    ApiIndividual,
    ApiFamily,
} from '../types/api';

/* ─── Constants ──────────────────────────────────────────────── */

const API_BASE = '/api';

/** Approximate dimensions of PersonNode for layout calculation */
const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;

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
    return individuals.map((person) => ({
        id: person.id,
        type: 'person',
        position: { x: 0, y: 0 }, // Will be set by applyLayout()
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
    }));
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
                type: 'straight',
                animated: false,
                style: {
                    stroke: '#FF8C00',
                    strokeWidth: 2,
                    strokeDasharray: '6 3',
                },
                label: '♥',
                data: { isSpouse: true },
            });
        }

        // Parent → Child edges (solid, cobalt, smoothstep for tree look)
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
                    type: 'smoothstep',
                    animated: false,
                    style: {
                        stroke: '#0047AB',
                        strokeWidth: 2,
                    },
                    data: { isSpouse: false },
                });
            }
        }
    }

    return edges;
}

/* ─── Dagre Layout Engine ────────────────────────────────────── */

const SPOUSE_GAP = 20; // Horizontal gap between spouse nodes

/**
 * Collect spouse pairs from edges.
 * Returns a map: nodeId → partnerId for nodes connected by a spouse edge.
 */
function collectSpousePairs(edges: Edge[]): Map<string, string> {
    const pairs = new Map<string, string>();
    for (const edge of edges) {
        const isSpouse = edge.data && typeof edge.data === 'object' && 'isSpouse' in edge.data && edge.data.isSpouse;
        if (isSpouse) {
            pairs.set(edge.source, edge.target);
            pairs.set(edge.target, edge.source);
        }
    }
    return pairs;
}

/**
 * Applies a hierarchical top-to-bottom layout using Dagre,
 * then post-processes to align spouses side-by-side on the same rank.
 */
function applyDagreLayout(
    nodes: Node<PersonNodeData>[],
    edges: Edge[],
): Node<PersonNodeData>[] {
    const spousePairs = collectSpousePairs(edges);

    // Identify which nodes are the "secondary" spouse (will be positioned
    // relative to their partner). We pick the target of each spouse edge.
    const secondarySpouses = new Set<string>();
    for (const edge of edges) {
        const isSpouse = edge.data && typeof edge.data === 'object' && 'isSpouse' in edge.data && edge.data.isSpouse;
        if (isSpouse) {
            secondarySpouses.add(edge.target);
        }
    }

    const g = new Dagre.graphlib.Graph({ directed: true, compound: false, multigraph: false });
    g.setDefaultEdgeLabel(() => ({}));

    // Configure layout: top-to-bottom, generous spacing
    g.setGraph({
        rankdir: 'TB',
        nodesep: 100,
        ranksep: 160,
        marginx: 40,
        marginy: 40,
    });

    // Add ALL nodes to Dagre (including secondary spouses, so they get a rank)
    for (const node of nodes) {
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    // Add parent-child edges
    for (const edge of edges) {
        const isSpouse = edge.data && typeof edge.data === 'object' && 'isSpouse' in edge.data && edge.data.isSpouse;
        if (!isSpouse) {
            g.setEdge(edge.source, edge.target);
        }
    }

    // For each spouse pair, add a same-rank invisible edge
    // by connecting secondary spouse to the same children as the primary,
    // so Dagre assigns them the same generation rank.
    for (const edge of edges) {
        const isSpouse = edge.data && typeof edge.data === 'object' && 'isSpouse' in edge.data && edge.data.isSpouse;
        if (isSpouse) {
            // Find children that the primary parent connects to
            const primaryId = edge.source;
            const secondaryId = edge.target;
            const primaryChildren = edges.filter(
                (e) => e.source === primaryId && !(e.data && typeof e.data === 'object' && 'isSpouse' in e.data && e.data.isSpouse)
            );
            // Connect secondary parent to the same children
            for (const childEdge of primaryChildren) {
                if (!g.hasEdge(secondaryId, childEdge.target)) {
                    g.setEdge(secondaryId, childEdge.target);
                }
            }
            // Also connect secondary parent FROM the same parents as primary
            const primaryParents = edges.filter(
                (e) => e.target === primaryId && !(e.data && typeof e.data === 'object' && 'isSpouse' in e.data && e.data.isSpouse)
            );
            for (const parentEdge of primaryParents) {
                if (!g.hasEdge(parentEdge.source, secondaryId)) {
                    g.setEdge(parentEdge.source, secondaryId);
                }
            }
        }
    }

    // Run layout
    Dagre.layout(g);

    // Build position map
    const positionMap = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
        const dagNode = g.node(node.id);
        positionMap.set(node.id, {
            x: dagNode.x - NODE_WIDTH / 2,
            y: dagNode.y - NODE_HEIGHT / 2,
        });
    }

    // Post-process: align each secondary spouse next to their partner
    for (const secondaryId of secondarySpouses) {
        const primaryId = spousePairs.get(secondaryId);
        if (!primaryId) continue;

        const primaryPos = positionMap.get(primaryId);
        if (!primaryPos) continue;

        // Place secondary spouse to the right of primary, same Y
        positionMap.set(secondaryId, {
            x: primaryPos.x + NODE_WIDTH + SPOUSE_GAP,
            y: primaryPos.y,
        });
    }

    // Map positions back to React Flow nodes
    return nodes.map((node) => {
        const pos = positionMap.get(node.id) ?? { x: 0, y: 0 };
        return {
            ...node,
            position: pos,
        };
    });
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

            // Auto-apply hierarchical layout after loading
            get().applyLayout();
        } catch (err) {
            set({
                isLoading: false,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        }
    },

    onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) as Node<PersonNodeData>[] });
    },

    onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    /**
     * Applies Dagre hierarchical layout (top-to-bottom tree).
     * Spouse edges are excluded from layout to preserve generational tiers.
     */
    applyLayout: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;
        const layouted = applyDagreLayout(nodes, edges);
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
