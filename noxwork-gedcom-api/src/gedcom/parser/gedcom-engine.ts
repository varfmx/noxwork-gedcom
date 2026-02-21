import {
    GedcomIndividual,
    GedcomFamily,
    GedcomParseResult,
    GedcomMetadata,
} from '../interfaces';

/**
 * Represents a single parsed GEDCOM line.
 * Format: LEVEL [XREF_ID] TAG [VALUE]
 */
interface GedcomLine {
    readonly level: number;
    readonly xrefId: string | null;
    readonly tag: string;
    readonly value: string;
}

/**
 * GedcomEngine — Core parser that converts raw GEDCOM text into structured JSON.
 *
 * Supports standard GEDCOM 5.5/5.5.1 tags for:
 * - HEAD (header metadata)
 * - INDI (individual records)
 * - FAM  (family records)
 */
export class GedcomEngine {
    /**
     * Parses raw GEDCOM file content into a structured result.
     */
    public parse(fileContent: string): GedcomParseResult {
        const lines = this.tokenize(fileContent);
        const records = this.groupRecords(lines);

        const individuals: Record<string, GedcomIndividual> = {};
        const families: Record<string, GedcomFamily> = {};
        let metadata: GedcomMetadata = {
            source: null,
            gedcomVersion: null,
            charset: null,
        };

        for (const record of records) {
            if (record.length === 0) continue;

            const header = record[0];

            if (header.tag === 'HEAD') {
                metadata = this.parseHeader(record);
            } else if (header.tag === 'INDI' && header.xrefId) {
                const individual = this.parseIndividual(header.xrefId, record);
                individuals[individual.id] = individual;
            } else if (header.tag === 'FAM' && header.xrefId) {
                const family = this.parseFamily(header.xrefId, record);
                families[family.id] = family;
            }
        }

        return { individuals, families, metadata };
    }

    /**
     * Tokenizes raw GEDCOM text into structured line objects.
     */
    private tokenize(content: string): GedcomLine[] {
        const rawLines = content.split(/\r?\n/);
        const parsed: GedcomLine[] = [];

        for (const raw of rawLines) {
            const trimmed = raw.trim();
            if (trimmed === '') continue;

            const line = this.parseLine(trimmed);
            if (line) {
                parsed.push(line);
            }
        }

        return parsed;
    }

    /**
     * Parses a single GEDCOM line into its components.
     *
     * GEDCOM line format:
     *   LEVEL [XREF_ID] TAG [LINE_VALUE]
     *
     * Examples:
     *   0 @I1@ INDI
     *   1 NAME John /Doe/
     *   2 DATE 1 JAN 1900
     */
    private parseLine(line: string): GedcomLine | null {
        // Match: level, optional @XREF@, tag, optional value
        const match = line.match(
            /^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s+(.*))?$/,
        );
        if (!match) return null;

        return {
            level: parseInt(match[1], 10),
            xrefId: match[2] ?? null,
            tag: match[3],
            value: (match[4] ?? '').trim(),
        };
    }

    /**
     * Groups parsed lines into top-level records.
     * Each record starts with a level-0 line and includes all
     * subsequent lines until the next level-0 line.
     */
    private groupRecords(lines: GedcomLine[]): GedcomLine[][] {
        const records: GedcomLine[][] = [];
        let current: GedcomLine[] = [];

        for (const line of lines) {
            if (line.level === 0) {
                if (current.length > 0) {
                    records.push(current);
                }
                current = [line];
            } else {
                current.push(line);
            }
        }

        if (current.length > 0) {
            records.push(current);
        }

        return records;
    }

    /**
     * Extracts metadata from the HEAD record.
     */
    private parseHeader(record: GedcomLine[]): GedcomMetadata {
        let source: string | null = null;
        let gedcomVersion: string | null = null;
        let charset: string | null = null;

        for (let i = 1; i < record.length; i++) {
            const line = record[i];

            if (line.tag === 'SOUR') {
                source = line.value || null;
            } else if (line.tag === 'VERS' && record[i - 1]?.tag === 'GEDC') {
                gedcomVersion = line.value || null;
            } else if (line.tag === 'CHAR') {
                charset = line.value || null;
            }
        }

        return { source, gedcomVersion, charset };
    }

    /**
     * Parses an INDI record into a GedcomIndividual.
     */
    private parseIndividual(
        xrefId: string,
        record: GedcomLine[],
    ): GedcomIndividual {
        let givenName = '';
        let surname = '';
        let fullName = '';
        let sex: 'M' | 'F' | 'U' = 'U';
        let birthDate: string | null = null;
        let birthPlace: string | null = null;
        let deathDate: string | null = null;
        let deathPlace: string | null = null;
        const familySpouseIds: string[] = [];
        let familyChildId: string | null = null;

        // Track context for sub-levels
        let currentEvent: 'BIRT' | 'DEAT' | null = null;

        for (let i = 1; i < record.length; i++) {
            const line = record[i];

            // Reset event context when we're back at level 1
            if (line.level === 1) {
                currentEvent = null;
            }

            switch (line.tag) {
                case 'NAME':
                    fullName = line.value.replace(/\//g, '').trim();
                    this.extractNameParts(line.value, (given, sur) => {
                        givenName = given;
                        surname = sur;
                    });
                    break;

                case 'GIVN':
                    givenName = line.value;
                    break;

                case 'SURN':
                    surname = line.value;
                    break;

                case 'SEX':
                    sex = this.parseSex(line.value);
                    break;

                case 'BIRT':
                    currentEvent = 'BIRT';
                    break;

                case 'DEAT':
                    currentEvent = 'DEAT';
                    break;

                case 'DATE':
                    if (currentEvent === 'BIRT') {
                        birthDate = line.value || null;
                    } else if (currentEvent === 'DEAT') {
                        deathDate = line.value || null;
                    }
                    break;

                case 'PLAC':
                    if (currentEvent === 'BIRT') {
                        birthPlace = line.value || null;
                    } else if (currentEvent === 'DEAT') {
                        deathPlace = line.value || null;
                    }
                    break;

                case 'FAMS':
                    if (line.value) familySpouseIds.push(line.value);
                    break;

                case 'FAMC':
                    familyChildId = line.value || null;
                    break;
            }
        }

        return {
            id: xrefId,
            givenName,
            surname,
            fullName,
            sex,
            birthDate,
            birthPlace,
            deathDate,
            deathPlace,
            familySpouseIds,
            familyChildId,
        };
    }

    /**
     * Parses a FAM record into a GedcomFamily.
     */
    private parseFamily(xrefId: string, record: GedcomLine[]): GedcomFamily {
        let husbandId: string | null = null;
        let wifeId: string | null = null;
        const childrenIds: string[] = [];
        let marriageDate: string | null = null;
        let marriagePlace: string | null = null;

        let inMarriageEvent = false;

        for (let i = 1; i < record.length; i++) {
            const line = record[i];

            if (line.level === 1) {
                inMarriageEvent = false;
            }

            switch (line.tag) {
                case 'HUSB':
                    husbandId = line.value || null;
                    break;

                case 'WIFE':
                    wifeId = line.value || null;
                    break;

                case 'CHIL':
                    if (line.value) childrenIds.push(line.value);
                    break;

                case 'MARR':
                    inMarriageEvent = true;
                    break;

                case 'DATE':
                    if (inMarriageEvent) {
                        marriageDate = line.value || null;
                    }
                    break;

                case 'PLAC':
                    if (inMarriageEvent) {
                        marriagePlace = line.value || null;
                    }
                    break;
            }
        }

        return {
            id: xrefId,
            husbandId,
            wifeId,
            childrenIds,
            marriageDate,
            marriagePlace,
        };
    }

    /**
     * Extracts given name and surname from a GEDCOM NAME value.
     * GEDCOM format: "GivenName /Surname/"
     */
    private extractNameParts(
        nameValue: string,
        callback: (givenName: string, surname: string) => void,
    ): void {
        const match = nameValue.match(/^(.*?)\s*\/([^/]*)\//);
        if (match) {
            callback(match[1].trim(), match[2].trim());
        } else {
            callback(nameValue.replace(/\//g, '').trim(), '');
        }
    }

    /**
     * Normalizes the SEX tag value.
     */
    private parseSex(value: string): 'M' | 'F' | 'U' {
        const normalized = value.trim().toUpperCase();
        if (normalized === 'M') return 'M';
        if (normalized === 'F') return 'F';
        return 'U';
    }
}
