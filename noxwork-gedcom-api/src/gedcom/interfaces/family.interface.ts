/**
 * Represents a parsed GEDCOM Family (FAM) record.
 */
export interface GedcomFamily {
    /** GEDCOM unique identifier, e.g. "@F1@" */
    readonly id: string;

    /** Husband / Partner 1 individual ID */
    readonly husbandId: string | null;

    /** Wife / Partner 2 individual ID */
    readonly wifeId: string | null;

    /** IDs of children belonging to this family */
    readonly childrenIds: readonly string[];

    /** Marriage date string (unparsed from GEDCOM) */
    readonly marriageDate: string | null;

    /** Marriage place */
    readonly marriagePlace: string | null;
}
