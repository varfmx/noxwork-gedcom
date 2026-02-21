/**
 * Represents a parsed GEDCOM Individual (INDI) record.
 */
export interface GedcomIndividual {
  /** GEDCOM unique identifier, e.g. "@I1@" */
  readonly id: string;

  /** Given name(s) */
  readonly givenName: string;

  /** Surname / family name */
  readonly surname: string;

  /** Full formatted name as it appeared in the GEDCOM file */
  readonly fullName: string;

  /** Sex: M, F, or U (unknown) */
  readonly sex: 'M' | 'F' | 'U';

  /** Birth date string (unparsed from GEDCOM) */
  readonly birthDate: string | null;

  /** Birth place */
  readonly birthPlace: string | null;

  /** Death date string (unparsed from GEDCOM) */
  readonly deathDate: string | null;

  /** Death place */
  readonly deathPlace: string | null;

  /** IDs of families where this person is a spouse (FAMS) */
  readonly familySpouseIds: readonly string[];

  /** ID of the family where this person is a child (FAMC) */
  readonly familyChildId: string | null;
}
