import { Inject, Injectable, Logger } from '@nestjs/common';
import { GedcomEngine } from './parser';
import type { GedcomParseResult } from './interfaces';
import type { GedcomRepository } from './repositories/gedcom.repository';
import { GEDCOM_REPOSITORY } from './repositories/gedcom.repository';


/**
 * GedcomService — Orchestrates GEDCOM file parsing and persistence.
 *
 * This service acts as the bridge between the controller layer
 * and the core parsing engine + repository pattern.
 */
@Injectable()
export class GedcomService {
    private readonly logger = new Logger(GedcomService.name);
    private readonly engine = new GedcomEngine();

    constructor(
        @Inject(GEDCOM_REPOSITORY)
        private readonly repository: GedcomRepository,
    ) { }

    /**
     * Parses raw GEDCOM file content and persists the result.
     *
     * @param fileContent - Raw text content of a .ged file
     * @returns Session ID and parsed result summary
     */
    async parseFile(fileContent: string): Promise<{
        sessionId: string;
        result: GedcomParseResult;
        stats: {
            individualsCount: number;
            familiesCount: number;
        };
    }> {
        this.logger.log('Starting GEDCOM file parsing...');

        const result = this.engine.parse(fileContent);

        const individualsCount = Object.keys(result.individuals).length;
        const familiesCount = Object.keys(result.families).length;

        this.logger.log(
            `Parsed ${individualsCount} individuals and ${familiesCount} families`,
        );

        const sessionId = await this.repository.saveParseResult(result);

        this.logger.log(`Results saved with session ID: ${sessionId}`);

        return {
            sessionId,
            result,
            stats: {
                individualsCount,
                familiesCount,
            },
        };
    }

    /**
     * Retrieves a previously parsed result by session ID.
     */
    async getSession(sessionId: string): Promise<GedcomParseResult | null> {
        return this.repository.getParseResult(sessionId);
    }
}
