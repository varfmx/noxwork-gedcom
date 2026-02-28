import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { RenameProjectDto } from './dto/rename-project.dto';
import type { AuthenticatedUser } from '../auth/interfaces';

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
}
