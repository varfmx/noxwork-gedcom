import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface BatchNodeUpdate {
  id: string;
  position: { x: number; y: number };
  lastUpdatedAt?: string; // ISO string for concurrency control
}

@Injectable()
export class NodeService {
  private readonly logger = new Logger(NodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handles multiple position updates in a single transaction.
   * Includes concurrency control to prevent older debounced calls
   * from overwriting newer manual updates.
   */
  async batchUpdatePositions(updates: BatchNodeUpdate[]) {
    this.logger.log(`Processing batch update for ${updates.length} nodes...`);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedNodes = [];

      for (const update of updates) {
        // Fetch current node to check concurrency
        const currentNode = await tx.person.findUnique({
          where: { id: update.id },
          select: { id: true, metadata: true, updatedAt: true },
        });

        if (!currentNode) {
          this.logger.warn(`Node ${update.id} not found during batch update.`);
          continue;
        }

        // Concurrency check: If the client provided a lastUpdatedAt timestamp,
        // ensure the database record hasn't been updated more recently.
        if (update.lastUpdatedAt) {
          const clientTime = new Date(update.lastUpdatedAt).getTime();
          const dbTime = currentNode.updatedAt.getTime();

          if (dbTime > clientTime) {
            this.logger.warn(`Concurrency conflict for node ${update.id}. Skipping update.`);
            continue; // Skip this update, it's stale
          }
        }

        // Merge existing metadata with new position
        const currentMetadata = (currentNode.metadata as Record<string, any>) || {};
        const newMetadata = {
          ...currentMetadata,
          position: update.position,
        };

        // Update the node
        const updated = await tx.person.update({
          where: { id: update.id },
          data: { metadata: newMetadata },
        });

        updatedNodes.push(updated);
      }

      this.logger.log(`Successfully updated ${updatedNodes.length} nodes.`);
      return updatedNodes;
    });
  }
}
