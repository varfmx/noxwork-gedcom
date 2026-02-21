import { GedcomIndividual, GedcomFamily, GedcomParseResult } from '../interfaces';

/**
 * Repository interface for GEDCOM data persistence.
 *
 * This abstraction allows us to swap storage implementations
 * (in-memory → Prisma + PostgreSQL) without modifying the service layer.
 */
export interface GedcomRepository {
    /**
     * Saves a complete parsed GEDCOM result and returns a unique session ID.
     */
    saveParseResult(result: GedcomParseResult): Promise<string>;

    /**
     * Retrieves all individuals for a given session.
     */
    getIndividuals(sessionId: string): Promise<GedcomIndividual[]>;

    /**
     * Retrieves all families for a given session.
     */
    getFamilies(sessionId: string): Promise<GedcomFamily[]>;

    /**
     * Retrieves the full parse result for a given session.
     */
    getParseResult(sessionId: string): Promise<GedcomParseResult | null>;
}

/**
 * Injection token for the GedcomRepository.
 */
export const GEDCOM_REPOSITORY = Symbol('GEDCOM_REPOSITORY');
