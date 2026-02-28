import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GedcomEngine } from '../gedcom/parser';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { RenameProjectDto } from './dto/rename-project.dto';
import type { UploadToProjectDto } from './dto/upload-to-project.dto';
import type { AuthenticatedUser } from '../auth/interfaces';
import type { GedcomIndividual, GedcomFamily } from '../gedcom/interfaces';

// ─── Public response shapes ───────────────────────────────────────────────────

export interface ProjectSummary {
    id: string;
    name: string;
    description: string | null;
    nodeCount: number;
    edgeCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Full project detail including reconstructed individuals and families
 * in the same shape the frontend expects from a GEDCOM upload.
 */
export interface ProjectDetail extends ProjectSummary {
    individuals: GedcomIndividual[];
    families: GedcomFamily[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * ProjectService — CRUD operations for genealogy projects (Tree records).
 *
 * Ownership is enforced at the Prisma query level by always scoping
 * `where` clauses with `{ id, userId }`.  Any attempt to read or mutate
 * a project that does not belong to the caller results in a 404/403 error
 * — we intentionally return 404 for reads to avoid leaking existence.
 */
@Injectable()
export class ProjectService {
    private readonly logger = new Logger(ProjectService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ── Helper: upsert User row so first-time SSO logins are handled ──────────

    /**
     * Ensures a `User` row exists for the Supabase identity.
     * Called before any write operation that creates/modifies a project.
     * Uses `upsert` to be idempotent — safe to call on every request.
     */
    private async ensureUser(user: AuthenticatedUser): Promise<void> {
        await this.prisma.user.upsert({
            where: { id: user.id },
            update: { email: user.email }, // keep email in sync with SSO
            create: { id: user.id, email: user.email },
        });
    }

    // ── GET /projects ─────────────────────────────────────────────────────────

    /**
     * Returns all projects belonging to `userId`, sorted by most recently
     * updated. Includes aggregate counts for persons (nodes) and relationships
     * (edges) so the frontend can display them without extra round-trips.
     */
    async findAllForUser(userId: string): Promise<ProjectSummary[]> {
        const trees = await this.prisma.tree.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        persons: true,
                        relationships: true,
                    },
                },
            },
        });

        return trees.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            nodeCount: t._count.persons,
            edgeCount: t._count.relationships,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));
    }

    // ── POST /projects ────────────────────────────────────────────────────────

    /**
     * Creates an empty genealogy project for the authenticated user.
     * Upserts the User row to handle first-time SSO logins gracefully.
     */
    async create(
        user: AuthenticatedUser,
        dto: CreateProjectDto,
    ): Promise<ProjectSummary> {
        await this.ensureUser(user);

        const tree = await this.prisma.tree.create({
            data: {
                name: dto.name,
                description: dto.description ?? null,
                userId: user.id,
            },
        });

        this.logger.log(
            `Project created: id=${tree.id} name="${tree.name}" userId=${user.id}`,
        );

        return {
            id: tree.id,
            name: tree.name,
            description: tree.description,
            nodeCount: 0,
            edgeCount: 0,
            createdAt: tree.createdAt,
            updatedAt: tree.updatedAt,
        };
    }

    // ── DELETE /projects/:id ──────────────────────────────────────────────────

    /**
     * Deletes a project and all its persons + relationships (cascade).
     *
     * Security: We first look up the tree with the caller's userId.
     * - If the record does not exist → 404 (prevents existence leak).
     * - If it exists but belongs to someone else → this can't happen with
     *   the scoped query, but we add the check defensively and return 403.
     */
    async delete(userId: string, projectId: string): Promise<void> {
        const tree = await this.prisma.tree.findUnique({
            where: { id: projectId },
            select: { id: true, userId: true },
        });

        if (!tree) {
            throw new NotFoundException(`Project ${projectId} not found.`);
        }

        if (tree.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to delete this project.',
            );
        }

        await this.prisma.tree.delete({ where: { id: projectId } });

        this.logger.log(`Project deleted: id=${projectId} userId=${userId}`);
    }

    // ── PATCH /projects/:id ───────────────────────────────────────────────────

    /**
     * Renames a project. Ownership is enforced via `updateMany`'s scoped
     * `where` — if the record doesn't exist for this user, `count === 0`
     * and we return 404 (caller gets no info about records belonging to others).
     */
    async rename(
        userId: string,
        projectId: string,
        dto: RenameProjectDto,
    ): Promise<ProjectSummary> {
        // First confirm ownership (same pattern as delete — avoids leaking existence)
        const existing = await this.prisma.tree.findUnique({
            where: { id: projectId },
            select: { id: true, userId: true },
        });

        if (!existing) {
            throw new NotFoundException(`Project ${projectId} not found.`);
        }

        if (existing.userId !== userId) {
            throw new ForbiddenException(
                'You do not have permission to modify this project.',
            );
        }

        const updated = await this.prisma.tree.update({
            where: { id: projectId },
            data: { name: dto.name },
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { persons: true, relationships: true } },
            },
        });

        this.logger.log(
            `Project renamed: id=${projectId} newName="${dto.name}" userId=${userId}`,
        );

        return {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            nodeCount: updated._count.persons,
            edgeCount: updated._count.relationships,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    // ── GET /projects/:id ─────────────────────────────────────────────────────

    /**
     * Returns a single project with all its Person and Relationship data,
     * reconstructed into the GedcomIndividual / GedcomFamily shapes that
     * the frontend expects (identical to a fresh GEDCOM upload response).
     *
     * Returns `null` if the project has no persisted data (nodeCount === 0).
     */
    async findOneForUser(
        userId: string,
        projectId: string,
    ): Promise<ProjectDetail> {
        const tree = await this.prisma.tree.findFirst({
            where: { id: projectId, userId },
            include: {
                persons: { orderBy: { createdAt: 'asc' } },
                relationships: true,
            },
        });

        if (!tree) {
            throw new NotFoundException(`Project ${projectId} not found.`);
        }

        // Build a DB-id → gedcomId lookup for relationship reconstruction
        const personById = new Map(
            tree.persons.map((p) => [p.id, p]),
        );

        // Reconstruct GedcomIndividual[]
        const individuals: GedcomIndividual[] = tree.persons.map((p) => {
            const metadata = (p.metadata as Record<string, unknown>) ?? {};

            // Rebuild familySpouseIds and familyChildId from relationships
            const spouseFamIds = (metadata['familySpouseIds'] as string[]) ?? [];
            const familyChildId = (metadata['familyChildId'] as string) ?? null;

            return {
                id: p.gedcomId ?? p.id,
                givenName: p.firstName,
                surname: p.lastName ?? '',
                fullName: [p.firstName, p.lastName].filter(Boolean).join(' '),
                sex: (p.gender as 'M' | 'F' | 'U') ?? 'U',
                birthDate: (metadata['birthDate'] as string) ?? null,
                birthPlace: (metadata['birthPlace'] as string) ?? null,
                deathDate: (metadata['deathDate'] as string) ?? null,
                deathPlace: (metadata['deathPlace'] as string) ?? null,
                familySpouseIds: spouseFamIds,
                familyChildId,
            };
        });

        // Reconstruct GedcomFamily[] from SPOUSE + PARENT relationships
        const families = this.reconstructFamilies(
            tree.relationships,
            personById,
        );

        return {
            id: tree.id,
            name: tree.name,
            description: tree.description,
            nodeCount: tree.persons.length,
            edgeCount: tree.relationships.length,
            createdAt: tree.createdAt,
            updatedAt: tree.updatedAt,
            individuals,
            families,
        };
    }

    // ── POST /projects/:id/upload ─────────────────────────────────────────────

    /**
     * Parses a GEDCOM file and persists its content into the database,
     * linked to the given project. Uses a Prisma transaction to:
     *   1. Delete all existing Person + Relationship rows for this tree
     *   2. Create Person rows from parsed individuals
     *   3. Create Relationship rows (PARENT + SPOUSE) from parsed families
     *
     * This "delete-then-insert" strategy is simpler and safer than upserts
     * for GEDCOM re-uploads where the entire dataset is being replaced.
     */
    async uploadToProject(
        userId: string,
        projectId: string,
        dto: UploadToProjectDto,
    ): Promise<ProjectDetail> {
        // 1. Verify ownership
        const tree = await this.prisma.tree.findFirst({
            where: { id: projectId, userId },
            select: { id: true, name: true },
        });

        if (!tree) {
            throw new NotFoundException(`Project ${projectId} not found.`);
        }

        // 2. Parse the GEDCOM content
        const engine = new GedcomEngine();
        const parsed = engine.parse(dto.fileContent);

        const indis = Object.values(parsed.individuals);
        const fams = Object.values(parsed.families);

        this.logger.log(
            `Uploading to project ${projectId}: ${indis.length} individuals, ${fams.length} families`,
        );

        // 3. Persist in a single transaction
        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Clear existing data for this project
            await tx.relationship.deleteMany({ where: { treeId: projectId } });
            await tx.person.deleteMany({ where: { treeId: projectId } });

            // Create all persons
            const personMap = new Map<string, string>(); // gedcomId → DB UUID
            for (const indi of indis) {
                const person = await tx.person.create({
                    data: {
                        treeId: projectId,
                        gedcomId: indi.id,
                        firstName: indi.givenName || indi.fullName || 'Unknown',
                        lastName: indi.surname || null,
                        gender: indi.sex,
                        birthDate: null, // raw GEDCOM date strings are stored in metadata
                        metadata: {
                            birthDate: indi.birthDate,
                            birthPlace: indi.birthPlace,
                            deathDate: indi.deathDate,
                            deathPlace: indi.deathPlace,
                            familySpouseIds: indi.familySpouseIds,
                            familyChildId: indi.familyChildId,
                        },
                    },
                });
                personMap.set(indi.id, person.id);
            }

            // Create relationships from family records
            const relationships: {
                treeId: string;
                type: string;
                subType: string | null;
                sourceId: string;
                targetId: string;
            }[] = [];

            for (const fam of fams) {
                // Spouse relationship
                if (fam.husbandId && fam.wifeId) {
                    const husbDbId = personMap.get(fam.husbandId);
                    const wifeDbId = personMap.get(fam.wifeId);
                    if (husbDbId && wifeDbId) {
                        relationships.push({
                            treeId: projectId,
                            type: 'SPOUSE',
                            subType: null,
                            sourceId: husbDbId,
                            targetId: wifeDbId,
                        });
                    }
                }

                // Parent → Child relationships
                const parentIds = [fam.husbandId, fam.wifeId].filter(
                    (id): id is string => id !== null,
                );

                for (const childGedcomId of fam.childrenIds) {
                    const childDbId = personMap.get(childGedcomId);
                    if (!childDbId) continue;

                    for (const parentGedcomId of parentIds) {
                        const parentDbId = personMap.get(parentGedcomId);
                        if (!parentDbId) continue;

                        relationships.push({
                            treeId: projectId,
                            type: 'PARENT',
                            subType: 'BIOLOGICAL',
                            sourceId: parentDbId,
                            targetId: childDbId,
                        });
                    }
                }
            }

            if (relationships.length > 0) {
                await tx.relationship.createMany({ data: relationships });
            }

            this.logger.log(
                `Persisted ${indis.length} persons and ${relationships.length} relationships for project ${projectId}`,
            );
        });

        // 4. Return the full project detail (same shape as findOneForUser)
        return this.findOneForUser(userId, projectId);
    }

    // ── Helper: Reconstruct GedcomFamily[] from relationships ──────────────────

    /**
     * Rebuilds GedcomFamily records from the flat Relationship rows,
     * reusing the same reconstruction logic as the GEDCOM exporter.
     *
     * Strategy:
     *   - SPOUSE rows → one family per pair (deduped by sorted key)
     *   - PARENT rows → children distributed into their parents' family
     *   - Single-parent children → get their own synthetic family
     */
    private reconstructFamilies(
        relationships: { id: string; type: string; subType: string | null; sourceId: string; targetId: string }[],
        personById: Map<string, { id: string; gedcomId: string | null }>,
    ): GedcomFamily[] {
        const gedcomIdOf = (dbId: string): string => {
            const p = personById.get(dbId);
            return p?.gedcomId ?? dbId;
        };

        // 1. Collect spouse pairs → families
        const famMap = new Map<string, { husbandId: string | null; wifeId: string | null; childrenIds: string[] }>();
        let famCounter = 1;

        // Build a map: sorted DB-pair → famKey
        const spousePairToFam = new Map<string, string>();

        for (const rel of relationships) {
            if (rel.type === 'SPOUSE') {
                const sortedKey = [rel.sourceId, rel.targetId].sort().join(':');
                if (!spousePairToFam.has(sortedKey)) {
                    const famId = `@F${famCounter++}@`;
                    spousePairToFam.set(sortedKey, famId);
                    famMap.set(famId, {
                        husbandId: gedcomIdOf(rel.sourceId),
                        wifeId: gedcomIdOf(rel.targetId),
                        childrenIds: [],
                    });
                }
            }
        }

        // 2. Place children into families
        // Build parent→child map grouped by child
        const childParents = new Map<string, string[]>(); // childDbId → parentDbIds
        for (const rel of relationships) {
            if (rel.type === 'PARENT') {
                const existing = childParents.get(rel.targetId) ?? [];
                existing.push(rel.sourceId);
                childParents.set(rel.targetId, existing);
            }
        }

        for (const [childDbId, parentDbIds] of childParents) {
            let placed = false;

            // Try to find a family where both parents are spouses
            if (parentDbIds.length >= 2) {
                for (let i = 0; i < parentDbIds.length && !placed; i++) {
                    for (let j = i + 1; j < parentDbIds.length && !placed; j++) {
                        const sortedKey = [parentDbIds[i], parentDbIds[j]].sort().join(':');
                        const famId = spousePairToFam.get(sortedKey);
                        if (famId) {
                            famMap.get(famId)!.childrenIds.push(gedcomIdOf(childDbId));
                            placed = true;
                        }
                    }
                }
            }

            // Fallback: two-parent implicit family or single-parent family
            if (!placed) {
                const famId = `@F${famCounter++}@`;
                const p1 = parentDbIds[0] ? gedcomIdOf(parentDbIds[0]) : null;
                const p2 = parentDbIds[1] ? gedcomIdOf(parentDbIds[1]) : null;
                famMap.set(famId, {
                    husbandId: p1,
                    wifeId: p2,
                    childrenIds: [gedcomIdOf(childDbId)],
                });
                // Register this implicit pair so other children of the same parents land in the same family
                if (parentDbIds.length >= 2) {
                    const sortedKey = [parentDbIds[0], parentDbIds[1]].sort().join(':');
                    spousePairToFam.set(sortedKey, famId);
                }
            }
        }

        return Array.from(famMap.entries()).map(([id, fam]) => ({
            id,
            husbandId: fam.husbandId,
            wifeId: fam.wifeId,
            childrenIds: fam.childrenIds,
            marriageDate: null,
            marriagePlace: null,
        }));
    }
}
