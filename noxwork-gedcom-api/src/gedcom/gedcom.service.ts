import { Inject, Injectable, Logger } from '@nestjs/common';
import { GedcomEngine } from './parser';
import type { GedcomParseResult } from './interfaces';
import type { GedcomRepository } from './repositories/gedcom.repository';
import { GEDCOM_REPOSITORY } from './repositories/gedcom.repository';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface TreePersonNode {
    gedcomId: string;
    firstName: string;
    lastName?: string;
    gender?: string;
    birthDate?: Date;
    metadata?: any;
}

export interface TreeRelationshipEdge {
    type: string;
    subType?: string;
    sourceGedcomId: string;
    targetGedcomId: string;
}

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
        private readonly prisma: PrismaService,
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

    /**
     * Saves a parsed tree (nodes and edges) into the database using a transaction.
     * Implements upsert logic based on gedcomId and treeId.
     */
    async saveTree(treeId: string, nodes: TreePersonNode[], edges: TreeRelationshipEdge[]) {
        this.logger.log(`Saving tree ${treeId} with ${nodes.length} nodes and ${edges.length} edges...`);

        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Ensure the tree exists
            const tree = await tx.tree.upsert({
                where: { id: treeId },
                update: {},
                create: { id: treeId, name: `Tree ${treeId}` },
            });

            // 2. Upsert all persons (nodes)
            const personMap = new Map<string, string>(); // Maps gedcomId to database UUID

            for (const node of nodes) {
                const person = await tx.person.upsert({
                    where: {
                        treeId_gedcomId: {
                            treeId: tree.id,
                            gedcomId: node.gedcomId,
                        },
                    },
                    update: {
                        firstName: node.firstName,
                        lastName: node.lastName,
                        gender: node.gender,
                        birthDate: node.birthDate,
                        metadata: node.metadata ?? {},
                    },
                    create: {
                        treeId: tree.id,
                        gedcomId: node.gedcomId,
                        firstName: node.firstName,
                        lastName: node.lastName,
                        gender: node.gender,
                        birthDate: node.birthDate,
                        metadata: node.metadata ?? {},
                    },
                });
                personMap.set(node.gedcomId, person.id);
            }

            // 3. Recreate relationships (edges)
            // To avoid duplicates and handle updates cleanly, we delete existing relationships for this tree
            // and recreate them based on the new edges array.
            await tx.relationship.deleteMany({
                where: { treeId: tree.id },
            });

            const relationshipsToCreate = edges.map((edge) => {
                const sourceId = personMap.get(edge.sourceGedcomId);
                const targetId = personMap.get(edge.targetGedcomId);

                if (!sourceId || !targetId) {
                    throw new Error(`Missing source or target person for edge ${edge.sourceGedcomId} -> ${edge.targetGedcomId}`);
                }

                return {
                    treeId: tree.id,
                    type: edge.type,
                    subType: edge.subType,
                    sourceId,
                    targetId,
                };
            });

            if (relationshipsToCreate.length > 0) {
                await tx.relationship.createMany({
                    data: relationshipsToCreate,
                });
            }

            this.logger.log(`Successfully saved tree ${treeId}`);
            return { treeId: tree.id, nodesSaved: nodes.length, edgesSaved: edges.length };
        });
    }

    /**
     * Fetches a complete tree (all people and their relationships) in a single query.
     */
    async getTree(treeId: string) {
        this.logger.log(`Fetching tree ${treeId}...`);

        const tree = await this.prisma.tree.findUnique({
            where: { id: treeId },
            include: {
                persons: true,
                relationships: true,
            },
        });

        if (!tree) {
            return null;
        }

        return tree;
    }

    /**
     * Updates a person's details or coordinates.
     */
    async updateNode(id: string, data: any) {
        this.logger.log(`Updating node ${id}...`);
        return this.prisma.person.update({
            where: { id },
            data,
        });
    }

    /**
     * Creates a new relationship between two existing nodes.
     */
    async createRelationship(data: { treeId: string; type: string; subType?: string; sourceId: string; targetId: string }) {
        this.logger.log(`Creating relationship between ${data.sourceId} and ${data.targetId}...`);
        return this.prisma.relationship.create({
            data,
        });
    }

    /**
     * Deletes a person and all their associated relationships (cascade).
     */
    async deleteNode(id: string) {
        this.logger.log(`Deleting node ${id}...`);
        return this.prisma.person.delete({
            where: { id },
        });
    }
}
