import { randomUUID } from 'crypto';
import { GedcomRepository } from './gedcom.repository';
import {
    GedcomIndividual,
    GedcomFamily,
    GedcomParseResult,
} from '../interfaces';

/**
 * In-memory implementation of GedcomRepository.
 *
 * This serves as the initial storage layer during development.
 * It will be replaced by a Prisma-backed implementation when
 * PostgreSQL is integrated.
 */
export class InMemoryGedcomRepository implements GedcomRepository {
    private readonly store = new Map<string, GedcomParseResult>();

    async saveParseResult(result: GedcomParseResult): Promise<string> {
        const sessionId = randomUUID();
        this.store.set(sessionId, result);
        return sessionId;
    }

    async getIndividuals(sessionId: string): Promise<GedcomIndividual[]> {
        const result = this.store.get(sessionId);
        if (!result) return [];
        return Object.values(result.individuals);
    }

    async getFamilies(sessionId: string): Promise<GedcomFamily[]> {
        const result = this.store.get(sessionId);
        if (!result) return [];
        return Object.values(result.families);
    }

    async getParseResult(sessionId: string): Promise<GedcomParseResult | null> {
        return this.store.get(sessionId) ?? null;
    }
}
