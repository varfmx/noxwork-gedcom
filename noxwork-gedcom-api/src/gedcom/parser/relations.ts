import type {
    GedcomIndividual,
    GedcomFamily,
    EdgeType,
    RelationshipType,
    KinshipPath,
    DetectedRole,
    EnrichedIndividual,
    RelationshipResult,
} from '../interfaces';

// ─── Internal Graph Types ───────────────────────────────────────────────────

/**
 * A directed edge in the adjacency graph.
 */
interface AdjacencyEdge {
    /** Target individual ID */
    readonly targetId: string;
    /** Type of edge */
    readonly type: EdgeType;
}

/**
 * A node in the adjacency graph, holding all outgoing edges.
 */
interface AdjacencyNode {
    readonly individualId: string;
    readonly edges: AdjacencyEdge[];
}

/**
 * BFS queue entry — represents a path being explored.
 */
interface BfsState {
    readonly currentId: string;
    readonly path: string[];
    readonly edges: EdgeType[];
    readonly visited: Set<string>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default maximum traversal depth to prevent runaway BFS in cyclic graphs. */
const DEFAULT_MAX_DEPTH = 10;

// ─── RelationshipResolver ───────────────────────────────────────────────────

/**
 * RelationshipResolver — Graph-based kinship engine.
 *
 * Processes parsed GEDCOM individuals and families to detect all
 * kinship relationships from a source individual, including complex
 * multi-role overlaps caused by pedigree collapse.
 *
 * **Algorithm:** Multi-path BFS with per-path visited sets.
 * Unlike standard BFS which uses a global visited set (finding only
 * the shortest path), this variant tracks visited nodes per-path,
 * allowing it to discover ALL meaningfully different routes to
 * each target individual.
 *
 * **Stateless & pure logic** — no NestJS DI, no side effects.
 * Instantiate directly and call `resolve()`.
 */
export class RelationshipResolver {
    private readonly maxDepth: number;

    constructor(maxDepth: number = DEFAULT_MAX_DEPTH) {
        this.maxDepth = maxDepth;
    }

    /**
     * Resolves all kinship relationships from a source individual.
     *
     * @param sourceId - GEDCOM ID of the source individual (e.g. "@I1@")
     * @param individuals - Map of individual ID → GedcomIndividual
     * @param families - Map of family ID → GedcomFamily
     * @returns RelationshipResult with enriched individuals
     */
    public resolve(
        sourceId: string,
        individuals: Record<string, GedcomIndividual>,
        families: Record<string, GedcomFamily>,
    ): RelationshipResult {
        // 1. Build adjacency graph
        const graph = this.buildAdjacencyGraph(individuals, families);

        // 2. Find all paths via multi-path BFS
        const allPaths = this.findAllPaths(sourceId, graph);

        // 3. Classify each path into a DetectedRole
        const rolesByTarget = this.classifyAllPaths(allPaths, families, individuals);

        // 4. Build enriched output
        const enrichedIndividuals = this.buildEnrichedResult(
            individuals,
            rolesByTarget,
        );

        return { sourceId, individuals: enrichedIndividuals };
    }

    // ─── Step 1: Adjacency Graph ──────────────────────────────────────────

    /**
     * Converts flat GEDCOM data into a bidirectional adjacency graph.
     *
     * For each family:
     * - Parent → Child edges (parent-of)
     * - Child → Parent edges (child-of)
     * - Spouse ↔ Spouse edges (spouse-of)
     */
    private buildAdjacencyGraph(
        individuals: Record<string, GedcomIndividual>,
        families: Record<string, GedcomFamily>,
    ): Map<string, AdjacencyNode> {
        const graph = new Map<string, AdjacencyNode>();

        // Initialize nodes for all individuals
        for (const id of Object.keys(individuals)) {
            graph.set(id, { individualId: id, edges: [] });
        }

        // Build edges from family records
        for (const family of Object.values(families)) {
            const parentIds: string[] = [];
            if (family.husbandId) parentIds.push(family.husbandId);
            if (family.wifeId) parentIds.push(family.wifeId);

            // Parent → Child edges
            for (const parentId of parentIds) {
                const parentNode = this.ensureNode(graph, parentId);
                for (const childId of family.childrenIds) {
                    parentNode.edges.push({ targetId: childId, type: 'parent-of' });

                    // Child → Parent (reverse edge)
                    const childNode = this.ensureNode(graph, childId);
                    childNode.edges.push({ targetId: parentId, type: 'child-of' });
                }
            }

            // Spouse ↔ Spouse edges
            if (family.husbandId && family.wifeId) {
                const husbandNode = this.ensureNode(graph, family.husbandId);
                const wifeNode = this.ensureNode(graph, family.wifeId);

                husbandNode.edges.push({ targetId: family.wifeId, type: 'spouse-of' });
                wifeNode.edges.push({ targetId: family.husbandId, type: 'spouse-of' });
            }
        }

        return graph;
    }

    /**
     * Ensures a node exists in the graph, creating it if absent.
     */
    private ensureNode(
        graph: Map<string, AdjacencyNode>,
        id: string,
    ): AdjacencyNode {
        let node = graph.get(id);
        if (!node) {
            node = { individualId: id, edges: [] };
            graph.set(id, node);
        }
        return node;
    }

    // ─── Step 2: Multi-Path BFS ───────────────────────────────────────────

    /**
     * Finds ALL paths from sourceId to every reachable individual.
     *
     * Key design: visited set is **per-path**, not global.
     * This allows discovering multiple routes to the same target
     * (essential for multi-role detection in pedigree collapse).
     *
     * Depth-capped at `this.maxDepth` hops.
     */
    private findAllPaths(
        sourceId: string,
        graph: Map<string, AdjacencyNode>,
    ): Map<string, KinshipPath[]> {
        const result = new Map<string, KinshipPath[]>();

        const queue: BfsState[] = [
            {
                currentId: sourceId,
                path: [sourceId],
                edges: [],
                visited: new Set([sourceId]),
            },
        ];

        while (queue.length > 0) {
            const state = queue.shift()!;

            // Depth cap check
            if (state.path.length > this.maxDepth) {
                continue;
            }

            const node = graph.get(state.currentId);
            if (!node) continue;

            for (const edge of node.edges) {
                // Skip already-visited nodes in THIS path (prevents cycles)
                if (state.visited.has(edge.targetId)) {
                    continue;
                }

                const newPath = [...state.path, edge.targetId];
                const newEdges = [...state.edges, edge.type];

                // Record the path to this target
                const kinshipPath: KinshipPath = {
                    path: newPath,
                    edges: newEdges,
                };

                if (!result.has(edge.targetId)) {
                    result.set(edge.targetId, []);
                }
                result.get(edge.targetId)!.push(kinshipPath);

                // Continue exploring from this neighbor
                const newVisited = new Set(state.visited);
                newVisited.add(edge.targetId);

                queue.push({
                    currentId: edge.targetId,
                    path: newPath,
                    edges: newEdges,
                    visited: newVisited,
                });
            }
        }

        return result;
    }

    // ─── Step 3: Kinship Classification ───────────────────────────────────

    /**
     * Classifies all discovered paths into DetectedRoles, grouped by target.
     * Deduplicates roles of the same type for the same target.
     */
    private classifyAllPaths(
        allPaths: Map<string, KinshipPath[]>,
        families: Record<string, GedcomFamily>,
        individuals: Record<string, GedcomIndividual>,
    ): Map<string, DetectedRole[]> {
        const rolesByTarget = new Map<string, DetectedRole[]>();

        for (const [targetId, paths] of allPaths) {
            const roles: DetectedRole[] = [];
            const seenTypes = new Set<string>();

            for (const kinshipPath of paths) {
                const type = this.classifyRelationship(
                    kinshipPath,
                    families,
                    individuals,
                );

                // Build a unique key combining type + degree to avoid true duplicates
                // but keep different-degree paths of the same type
                const roleKey = `${type}:${kinshipPath.edges.length}`;

                if (!seenTypes.has(roleKey)) {
                    seenTypes.add(roleKey);
                    roles.push({
                        type,
                        degree: kinshipPath.edges.length,
                        kinshipPath,
                    });
                }
            }

            if (roles.length > 0) {
                rolesByTarget.set(targetId, roles);
            }
        }

        return rolesByTarget;
    }

    /**
     * Classifies a single kinship path into a RelationshipType.
     *
     * Strategy: Analyze the sequence of edge types to determine
     * generational offset and lateral distance.
     *
     * - Count "child-of" edges (going UP in the tree)
     * - Count "parent-of" edges (going DOWN in the tree)
     * - Detect spouse-of edges (lateral, same generation)
     * - Use generational math to classify the relationship
     */
    private classifyRelationship(
        kinshipPath: KinshipPath,
        families: Record<string, GedcomFamily>,
        individuals: Record<string, GedcomIndividual>,
    ): RelationshipType {
        const { edges, path } = kinshipPath;

        if (edges.length === 0) {
            return 'Unknown';
        }

        // Direct (1-hop) relationships
        if (edges.length === 1) {
            return this.classifyDirectRelationship(edges[0]);
        }

        // Check for spouse-only paths
        if (edges.every((e) => e === 'spouse-of')) {
            return 'Spouse';
        }

        // Compute generational profile
        const profile = this.computeGenerationalProfile(edges);

        // Spouse-of edges don't change generation — filter them for classification
        // but note their presence (indicates in-law, though we simplify for now)
        const hasSpouseEdge = edges.includes('spouse-of');

        // Check for sibling / half-sibling (go up then down through same family)
        if (profile.up === 1 && profile.down === 1 && edges.length === 2) {
            return this.classifySiblingType(path, families, individuals);
        }

        // Classify based on generational offset
        return this.classifyByGeneration(profile, edges, path, families, individuals, hasSpouseEdge);
    }

    /**
     * Classifies a direct (1-hop) relationship.
     */
    private classifyDirectRelationship(edge: EdgeType): RelationshipType {
        switch (edge) {
            case 'parent-of':
                return 'Child'; // Source is parent-of target, so target is Child
            case 'child-of':
                return 'Parent'; // Source is child-of target, so target is Parent
            case 'spouse-of':
                return 'Spouse';
        }
    }

    /**
     * Computes the generational profile from a sequence of edges.
     *
     * - "child-of" = going UP one generation
     * - "parent-of" = going DOWN one generation
     * - "spouse-of" = same generation (no change)
     */
    private computeGenerationalProfile(edges: readonly EdgeType[]): {
        up: number;
        down: number;
        net: number;
    } {
        let up = 0;
        let down = 0;

        for (const edge of edges) {
            if (edge === 'child-of') up++;
            else if (edge === 'parent-of') down++;
            // spouse-of: no generational change
        }

        return { up, down, net: up - down };
    }

    /**
     * Determines if a 2-hop up-down path is a Sibling or Half-Sibling.
     *
     * Full Sibling: Both source and target share BOTH parents (same family).
     * Half-Sibling: They share exactly one parent (different families).
     */
    private classifySiblingType(
        path: readonly string[],
        families: Record<string, GedcomFamily>,
        individuals: Record<string, GedcomIndividual>,
    ): RelationshipType {
        const sourceId = path[0];
        const targetId = path[path.length - 1];

        const sourceIndividual = individuals[sourceId];
        const targetIndividual = individuals[targetId];

        if (!sourceIndividual || !targetIndividual) {
            return 'Sibling';
        }

        // If both are children in the same family → full sibling
        if (
            sourceIndividual.familyChildId &&
            targetIndividual.familyChildId &&
            sourceIndividual.familyChildId === targetIndividual.familyChildId
        ) {
            return 'Sibling';
        }

        // Different families → check if they share any parent
        return 'Half-Sibling';
    }

    /**
     * Classifies a relationship based on generational offset.
     *
     * Generational math:
     * - net > 0: Target is ABOVE source (ancestor direction)
     * - net < 0: Target is BELOW source (descendant direction)
     * - net = 0: Same generation (sibling, cousin)
     *
     * Lateral distance (for cousins/uncles): min(up, down) when both > 0
     */
    private classifyByGeneration(
        profile: { up: number; down: number; net: number },
        edges: readonly EdgeType[],
        path: readonly string[],
        families: Record<string, GedcomFamily>,
        individuals: Record<string, GedcomIndividual>,
        _hasSpouseEdge: boolean,
    ): RelationshipType {
        const { up, down, net } = profile;

        // ─── Pure vertical: only going up ───
        if (down === 0 && up > 0) {
            return this.classifyAncestor(up);
        }

        // ─── Pure vertical: only going down ───
        if (up === 0 && down > 0) {
            return this.classifyDescendant(down);
        }

        // ─── Same generation (net === 0, both up and down > 0) ───
        if (net === 0 && up > 0) {
            if (up === 1) {
                return this.classifySiblingType(path, families, individuals);
            }
            // up >= 2 → Cousin (generalized)
            return 'Cousin';
        }

        // ─── Diagonal: different generation, both up and down ───

        // Uncle/Aunt: go up more than down (net > 0), lateral movement
        if (net > 0) {
            if (net === 1 && down >= 1) {
                // Go up 2, down 1 → Uncle/Aunt
                if (up === 2 && down === 1) return 'Uncle/Aunt';
                // Go up 3, down 2 → Still classifiable as cousin-variant
                return up >= 3 ? 'Great-Uncle/Aunt' : 'Uncle/Aunt';
            }
            if (net === 2 && down >= 1) {
                return 'Great-Uncle/Aunt';
            }
            // Deeper ancestor-side connections
            return net >= 3 ? 'Great-Uncle/Aunt' : 'Uncle/Aunt';
        }

        // Nephew/Niece: go down more than up (net < 0), lateral movement
        if (net < 0) {
            const absNet = Math.abs(net);
            if (absNet === 1 && up >= 1) {
                if (up === 1 && down === 2) return 'Nephew/Niece';
                return up >= 2 ? 'Great-Nephew/Niece' : 'Nephew/Niece';
            }
            if (absNet === 2 && up >= 1) {
                return 'Great-Nephew/Niece';
            }
            return absNet >= 3 ? 'Great-Nephew/Niece' : 'Nephew/Niece';
        }

        return 'Unknown';
    }

    /**
     * Classifies pure-ancestor relationships by hop count.
     */
    private classifyAncestor(hops: number): RelationshipType {
        switch (hops) {
            case 1:
                return 'Parent';
            case 2:
                return 'Grandparent';
            default:
                return 'Great-Grandparent';
        }
    }

    /**
     * Classifies pure-descendant relationships by hop count.
     */
    private classifyDescendant(hops: number): RelationshipType {
        switch (hops) {
            case 1:
                return 'Child';
            case 2:
                return 'Grandchild';
            default:
                return 'Great-Grandchild';
        }
    }

    // ─── Step 4: Build Enriched Result ────────────────────────────────────

    /**
     * Merges detected roles into the original individuals to produce
     * enriched output.
     */
    private buildEnrichedResult(
        individuals: Record<string, GedcomIndividual>,
        rolesByTarget: Map<string, DetectedRole[]>,
    ): Record<string, EnrichedIndividual> {
        const result: Record<string, EnrichedIndividual> = {};

        for (const [id, individual] of Object.entries(individuals)) {
            const detectedRoles = rolesByTarget.get(id) ?? [];
            result[id] = {
                ...individual,
                detectedRoles,
            };
        }

        return result;
    }
}
