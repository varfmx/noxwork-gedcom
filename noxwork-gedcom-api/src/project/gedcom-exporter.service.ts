import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Person, Relationship } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * @fileoverview GedcomExporterService
 *
 * Reconstructs a valid GEDCOM 5.5.1 file from persisted Tree records.
 * The core challenge is rebuilding FAM records from the flat Relationship
 * rows in the database. The export runs in four phases:
 *
 * ── Phase 1: Stable GEDCOM ID Assignment ──────────────────────────────────
 *   Persons imported from a file reuse their original IDs (@I1@, @I2@, …).
 *   Hand-crafted nodes receive synthetic IDs that are guaranteed not to
 *   collide with any existing GEDCOM IDs in the tree.
 *
 * ── Phase 2: FAM Record Reconstruction ────────────────────────────────────
 *   Two passes over the Relationship rows:
 *     • SPOUSE pairs   → one FAM each, deduped on a sorted DB-id pair key
 *                        so (A,B) and (B,A) always resolve to the same FAM.
 *     • PARENT→child   → each child is placed into the FAM where both of
 *                        its parents are already spouses. Falls back to an
 *                        implicit two-parent FAM (if no SPOUSE rel exists)
 *                        or a single-parent FAM when only one parent is known.
 *
 * ── Phase 3: Cross-Reference Maps ────────────────────────────────────────
 *   Inverted indexes (gedcomId → FAM IDs) are built so that each INDI
 *   record can emit correct `1 FAMS @F1@` and `1 FAMC @F1@` back-links,
 *   which are required for spec-compliant output accepted by validators
 *   such as the GEDCOM Parser and Gramps.
 *
 * ── Phase 4: GEDCOM Text Generation ──────────────────────────────────────
 *   Emits:
 *     • HEAD block  — source set to "Noxwork Technologies", version 5.5.1
 *     • INDI records — NAME, SEX, BIRT/DATE, FAMS, FAMC
 *     • FAM records  — HUSB, WIFE, CHIL (one tag per child)
 *     • TRLR
 *   Dates are formatted as `DD MON YYYY` (e.g. "15 JAN 1990").
 *   Line endings are CR LF (\r\n) as required by GEDCOM 5.5.1 §1.3.
 *
 *   Fernando Valderrábano-Reyes — Feb 2026
 */

// ─── Internal Types ───────────────────────────────────────────────────────────

interface FamRecord {
    /** Synthetic GEDCOM family ID, e.g. @F1@ */
    famId: string;
    /** GEDCOM ID of the husband/partner-1, if known */
    husbGedcomId: string | null;
    /** GEDCOM ID of the wife/partner-2, if known */
    wifeGedcomId: string | null;
    /** GEDCOM IDs of children */
    childGedcomIds: string[];
}

// ─── GEDCOM Exporter Service ──────────────────────────────────────────────────

/**
 * GedcomExporterService — Reconstructs a valid GEDCOM 5.5.1 file from a
 * persisted Tree record (Person + Relationship rows).
 *
 * Algorithm overview:
 *   1. Assign stable GEDCOM IDs to persons that lack one (e.g. hand-crafted nodes).
 *   2. Reconstruct FAM records by grouping SPOUSE pairs and then distributing
 *      children (via PARENT rels) into their correct FAM.
 *   3. Emit INDI records with FAMS / FAMC cross-references.
 *   4. Emit FAM records with HUSB / WIFE / CHIL cross-references.
 *   5. Wrap with a standard HEAD block and 0 TRLR.
 *
 * Output: GEDCOM 5.5.1 text with CRLF line endings, as required by the spec.
 */
@Injectable()
export class GedcomExporterService {
    private readonly logger = new Logger(GedcomExporterService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Exports a project as a GEDCOM 5.5.1 string.
     *
     * @param treeId  - The project UUID.
     * @param userId  - Caller's Supabase user ID (ownership check).
     * @returns `{ filename, content }` where `content` is the full .ged text.
     *
     * @throws NotFoundException if the project doesn't exist or belongs to
     *         a different user.
     */
    async export(
        treeId: string,
        userId: string,
    ): Promise<{ filename: string; content: string }> {
        // 1. Ownership-scoped query (same pattern as ProjectService)
        const tree = await this.prisma.tree.findFirst({
            where: { id: treeId, userId },
            include: {
                persons: { orderBy: { createdAt: 'asc' } },
                relationships: true,
            },
        });

        if (!tree) {
            throw new NotFoundException(
                `Project ${treeId} not found or does not belong to you.`,
            );
        }

        this.logger.log(
            `Exporting tree id=${treeId} (${tree.persons.length} persons, ` +
            `${tree.relationships.length} relationships)`,
        );

        // 2. Build a stable GEDCOM ID for every person
        const gedcomIdOf = this.buildGedcomIdMap(tree.persons);

        // 3. Reconstruct FAM records from SPOUSE + PARENT relationships
        const fams = this.buildFamRecords(
            tree.persons,
            tree.relationships,
            gedcomIdOf,
        );

        // 4. Build cross-reference maps (person → FAMs as spouse / FAMs as child)
        const famsOf = this.buildFamsOf(fams, gedcomIdOf);
        const famcOf = this.buildFamcOf(fams, gedcomIdOf);

        // 5. Generate GEDCOM text
        const lines: string[] = [
            ...this.buildHeader(tree.name),
            ...tree.persons.flatMap((p) =>
                this.buildIndi(p, gedcomIdOf, famsOf, famcOf),
            ),
            ...fams.flatMap((f) => this.buildFam(f)),
            '0 TRLR',
        ];

        // GEDCOM 5.5.1 §1.3: lines must end with CR LF
        const content = lines.join('\r\n') + '\r\n';

        const filename =
            tree.name
                .replace(/[^\w\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-')
                .toLowerCase() + '.ged';

        return { filename, content };
    }

    // ── Step 1: Assign stable GEDCOM IDs ─────────────────────────────────────

    /**
     * Returns a Map<personDbId, gedcomId>.
     *
     * If `person.gedcomId` is already set (i.e. the person was imported from a
     * GEDCOM file), we reuse it verbatim.  Otherwise we generate a synthetic
     * ID (@I1@, @I2@, …) so the output is always valid.
     */
    private buildGedcomIdMap(persons: Person[]): Map<string, string> {
        const map = new Map<string, string>();
        let counter = 1;

        for (const p of persons) {
            if (p.gedcomId) {
                map.set(p.id, p.gedcomId);
            } else {
                // Ensure synthetic IDs don't collide with existing ones
                let candidate = `@I${counter}@`;
                const existing = new Set(
                    persons.map((x) => x.gedcomId).filter(Boolean),
                );
                while (existing.has(candidate)) {
                    counter++;
                    candidate = `@I${counter}@`;
                }
                map.set(p.id, candidate);
                counter++;
            }
        }

        return map;
    }

    // ── Step 2: Reconstruct FAM records ──────────────────────────────────────

    /**
     * Reconstructs GEDCOM FAM records from the flat Relationship rows.
     *
     * Strategy:
     *   1. SPOUSE pairs → one FAM each (deduped on sorted DB-id pair key).
     *   2. PARENT→child rows → children are distributed into:
     *        a. The FAM where both parents are already spouses.
     *        b. A new single-parent FAM if only one parent is recorded.
     *        c. An implicit two-parent FAM if two parents exist but no SPOUSE
     *           relationship was recorded for them.
     */
    private buildFamRecords(
        persons: Person[],
        relationships: Relationship[],
        gedcomIdOf: Map<string, string>,
    ): FamRecord[] {
        const personById = new Map(persons.map((p) => [p.id, p]));
        let famCounter = 1;

        // ── Phase A: SPOUSE pairs ─────────────────────────────────────────────
        // Key = sorted DB IDs joined: ensures (A,B) and (B,A) map to same FAM
        const famBySpouseKey = new Map<string, FamRecord>();

        for (const rel of relationships.filter((r) => r.type === 'SPOUSE')) {
            const key = [rel.sourceId, rel.targetId].sort().join('::');
            if (famBySpouseKey.has(key)) continue;

            const p1 = personById.get(rel.sourceId)!;
            const p2 = personById.get(rel.targetId)!;
            if (!p1 || !p2) continue;

            const [husbGedcomId, wifeGedcomId] = this.assignRoles(
                p1,
                p2,
                gedcomIdOf,
            );

            famBySpouseKey.set(key, {
                famId: `@F${famCounter++}@`,
                husbGedcomId,
                wifeGedcomId,
                childGedcomIds: [],
            });
        }

        // ── Phase B: Distribute children into FAMs ────────────────────────────

        // child DB ID → parent DB IDs
        const childToParents = new Map<string, string[]>();
        for (const rel of relationships.filter((r) => r.type === 'PARENT')) {
            if (!childToParents.has(rel.targetId))
                childToParents.set(rel.targetId, []);
            childToParents.get(rel.targetId)!.push(rel.sourceId);
        }

        const assignedChildren = new Set<string>();

        for (const [childId, parentIds] of childToParents) {
            const child = personById.get(childId);
            if (!child) continue;
            const childGedcomId = gedcomIdOf.get(childId)!;

            // Try to find an existing spouse FAM that contains the parent(s)
            let placed = false;
            if (parentIds.length >= 2) {
                // Look for a FAM with any combination of two parents
                outer: for (let i = 0; i < parentIds.length; i++) {
                    for (let j = i + 1; j < parentIds.length; j++) {
                        const key = [parentIds[i], parentIds[j]]
                            .sort()
                            .join('::');
                        if (famBySpouseKey.has(key)) {
                            famBySpouseKey
                                .get(key)!
                                .childGedcomIds.push(childGedcomId);
                            placed = true;
                            break outer;
                        }
                    }
                }

                // No SPOUSE rel found — create an implicit FAM for first two parents
                if (!placed) {
                    const p1 = personById.get(parentIds[0])!;
                    const p2 = personById.get(parentIds[1])!;
                    if (p1 && p2) {
                        const key = [parentIds[0], parentIds[1]]
                            .sort()
                            .join('::');
                        const [husbGedcomId, wifeGedcomId] = this.assignRoles(
                            p1,
                            p2,
                            gedcomIdOf,
                        );
                        const fam: FamRecord = {
                            famId: `@F${famCounter++}@`,
                            husbGedcomId,
                            wifeGedcomId,
                            childGedcomIds: [childGedcomId],
                        };
                        famBySpouseKey.set(key, fam);
                        placed = true;
                    }
                }
            }

            // Single-parent FAM (or fallback)
            if (!placed && parentIds.length >= 1) {
                const parentId = parentIds[0];
                const parent = personById.get(parentId);
                if (!parent) continue;

                const singleKey = `single::${parentId}`;
                if (!famBySpouseKey.has(singleKey)) {
                    const isMale = parent.gender === 'M';
                    const isFemale = parent.gender === 'F';
                    famBySpouseKey.set(singleKey, {
                        famId: `@F${famCounter++}@`,
                        husbGedcomId:
                            isMale || !isFemale
                                ? (gedcomIdOf.get(parentId) ?? null)
                                : null,
                        wifeGedcomId:
                            isFemale
                                ? (gedcomIdOf.get(parentId) ?? null)
                                : null,
                        childGedcomIds: [],
                    });
                }
                famBySpouseKey
                    .get(singleKey)!
                    .childGedcomIds.push(childGedcomId);
                placed = true;
            }

            if (placed) assignedChildren.add(childId);
        }

        return Array.from(famBySpouseKey.values());
    }

    /**
     * Determines HUSB/WIFE assignment for a pair of persons.
     * Applies GEDCOM convention: M → HUSB, F → WIFE; ambiguous → source first.
     *
     * @returns [husbGedcomId, wifeGedcomId]
     */
    private assignRoles(
        p1: Person,
        p2: Person,
        gedcomIdOf: Map<string, string>,
    ): [string | null, string | null] {
        const g1 = p1.gender?.toUpperCase();
        const g2 = p2.gender?.toUpperCase();
        const id1 = gedcomIdOf.get(p1.id) ?? null;
        const id2 = gedcomIdOf.get(p2.id) ?? null;

        if (g1 === 'M' && g2 === 'F') return [id1, id2];
        if (g1 === 'F' && g2 === 'M') return [id2, id1];
        if (g1 === 'M') return [id1, id2]; // p2 unknown
        if (g2 === 'M') return [id2, id1]; // p1 unknown
        if (g1 === 'F') return [id2, id1]; // p1=F → p2 is husb slot
        if (g2 === 'F') return [id1, id2]; // p2=F → p1 is husb slot
        return [id1, id2]; // both unknown — preserve insertion order
    }

    // ── Step 3: Cross-reference maps ─────────────────────────────────────────

    /**
     * person gedcomId → FAM IDs where the person appears as HUSB or WIFE
     */
    private buildFamsOf(
        fams: FamRecord[],
        gedcomIdOf: Map<string, string>,
    ): Map<string, string[]> {
        // Invert gedcomIdOf: gedcomId → dbId (for reverse lookups)
        const gedcomIds = new Set(gedcomIdOf.values());
        const famsOf = new Map<string, string[]>();

        for (const gedcomId of gedcomIds) {
            famsOf.set(gedcomId, []);
        }

        for (const fam of fams) {
            if (fam.husbGedcomId) {
                famsOf.get(fam.husbGedcomId)?.push(fam.famId);
            }
            if (fam.wifeGedcomId) {
                famsOf.get(fam.wifeGedcomId)?.push(fam.famId);
            }
        }

        return famsOf;
    }

    /**
     * person gedcomId → FAM IDs where the person appears as CHIL
     */
    private buildFamcOf(
        fams: FamRecord[],
        gedcomIdOf: Map<string, string>,
    ): Map<string, string[]> {
        const gedcomIds = new Set(gedcomIdOf.values());
        const famcOf = new Map<string, string[]>();

        for (const gedcomId of gedcomIds) {
            famcOf.set(gedcomId, []);
        }

        for (const fam of fams) {
            for (const childId of fam.childGedcomIds) {
                famcOf.get(childId)?.push(fam.famId);
            }
        }

        return famcOf;
    }

    // ── Step 4: GEDCOM text generation ───────────────────────────────────────

    /**
     * Builds the GEDCOM 5.5.1 HEAD block.
     * See: https://www.gedcom.org/gedcom.html §2
     */
    private buildHeader(treeName: string): string[] {
        const today = this.formatDate(new Date());
        return [
            '0 HEAD',
            '1 SOUR NOXWORK',
            '2 NAME Noxwork Technologies',
            '2 VERS 1.0',
            '2 CORP Noxwork Technologies',
            '1 DEST NOXWORK',
            `1 DATE ${today}`,
            '1 GEDC',
            '2 VERS 5.5.1',
            '2 FORM LINEAGE-LINKED',
            '1 CHAR UTF-8',
            `1 FILE ${treeName}.ged`,
            `1 NOTE Exported from Noxwork RADIX FLOW platform`,
        ];
    }

    /**
     * Builds a single INDI (individual) record.
     *
     * Tags emitted:
     *   NAME, SEX, BIRT/DATE, FAMS (spouse family links), FAMC (child family links)
     */
    private buildIndi(
        person: Person,
        gedcomIdOf: Map<string, string>,
        famsOf: Map<string, string[]>,
        famcOf: Map<string, string[]>,
    ): string[] {
        const gedcomId = gedcomIdOf.get(person.id)!;
        const lines: string[] = [`0 ${gedcomId} INDI`];

        // NAME — GEDCOM convention: /Surname/ with given name before it
        const givenName = person.firstName ?? '';
        const surname = person.lastName ? `/${person.lastName}/` : '//';
        lines.push(`1 NAME ${givenName} ${surname}`.trimEnd());

        // SEX
        const sex = person.gender?.toUpperCase();
        if (sex === 'M' || sex === 'F') {
            lines.push(`1 SEX ${sex}`);
        } else if (sex) {
            lines.push(`1 SEX U`);
        }

        // BIRT / DATE
        if (person.birthDate) {
            lines.push('1 BIRT');
            lines.push(`2 DATE ${this.formatDate(new Date(person.birthDate))}`);
        }

        // FAMS — appearances as spouse in a family
        for (const famId of famsOf.get(gedcomId) ?? []) {
            lines.push(`1 FAMS ${famId}`);
        }

        // FAMC — appearances as child in a family
        for (const famId of famcOf.get(gedcomId) ?? []) {
            lines.push(`1 FAMC ${famId}`);
        }

        return lines;
    }

    /**
     * Builds a single FAM (family) record.
     *
     * Tags emitted: HUSB, WIFE, CHIL (one per child)
     */
    private buildFam(fam: FamRecord): string[] {
        const lines: string[] = [`0 ${fam.famId} FAM`];

        if (fam.husbGedcomId) {
            lines.push(`1 HUSB ${fam.husbGedcomId}`);
        }
        if (fam.wifeGedcomId) {
            lines.push(`1 WIFE ${fam.wifeGedcomId}`);
        }
        for (const childId of fam.childGedcomIds) {
            lines.push(`1 CHIL ${childId}`);
        }

        return lines;
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    /**
     * Formats a Date as a GEDCOM 5.5.1 date value: "DD MON YYYY"
     * (e.g. "15 JAN 1990").  Day and month are zero-padded / three-letter abbr.
     */
    private formatDate(date: Date): string {
        const MONTHS = [
            'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
        ];
        const d = String(date.getUTCDate()).padStart(2, '0');
        const m = MONTHS[date.getUTCMonth()];
        const y = date.getUTCFullYear();
        return `${d} ${m} ${y}`;
    }
}
