import type { GedcomIndividual } from './individual.interface';

/**
 * Edge type in the kinship adjacency graph.
 */
export type EdgeType = 'parent-of' | 'child-of' | 'spouse-of';

/**
 * Classified relationship type labels.
 */
export type RelationshipType =
    | 'Parent'
    | 'Child'
    | 'Sibling'
    | 'Half-Sibling'
    | 'Spouse'
    | 'Grandparent'
    | 'Grandchild'
    | 'Uncle/Aunt'
    | 'Nephew/Niece'
    | 'Cousin'
    | 'Great-Grandparent'
    | 'Great-Grandchild'
    | 'Great-Uncle/Aunt'
    | 'Great-Nephew/Niece'
    | 'Unknown';

/**
 * Represents a single traversal path between two individuals
 * through the kinship graph.
 */
export interface KinshipPath {
    /** Ordered list of individual IDs from source to target */
    readonly path: readonly string[];

    /** Edge labels for each hop in the path */
    readonly edges: readonly EdgeType[];
}

/**
 * A classified kinship result for a specific path.
 */
export interface DetectedRole {
    /** The classified relationship type */
    readonly type: RelationshipType;

    /** Degree of separation (number of hops) */
    readonly degree: number;

    /** The specific path taken through the graph */
    readonly kinshipPath: KinshipPath;
}

/**
 * An individual enriched with detected relationship roles
 * relative to a source individual.
 */
export interface EnrichedIndividual extends GedcomIndividual {
    /** All detected kinship roles relative to the source */
    readonly detectedRoles: readonly DetectedRole[];
}

/**
 * The complete output of the RelationshipResolver.
 */
export interface RelationshipResult {
    /** The source individual ID from which all relationships are computed */
    readonly sourceId: string;

    /** Map of individual ID → enriched individual with detected roles */
    readonly individuals: Record<string, EnrichedIndividual>;
}
