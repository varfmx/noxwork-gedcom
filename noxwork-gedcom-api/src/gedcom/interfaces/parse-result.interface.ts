import { GedcomIndividual } from './individual.interface';
import { GedcomFamily } from './family.interface';

/**
 * The complete result of parsing a GEDCOM file.
 */
export interface GedcomParseResult {
    /** Map of individual ID → Individual data */
    readonly individuals: Record<string, GedcomIndividual>;

    /** Map of family ID → Family data */
    readonly families: Record<string, GedcomFamily>;

    /** Header metadata extracted from the GEDCOM file */
    readonly metadata: GedcomMetadata;
}

/**
 * Basic metadata from the GEDCOM HEAD section.
 */
export interface GedcomMetadata {
    readonly source: string | null;
    readonly gedcomVersion: string | null;
    readonly charset: string | null;
}
