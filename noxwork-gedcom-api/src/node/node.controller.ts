import { Body, Controller, Patch } from '@nestjs/common';
import { NodeService, BatchNodeUpdate } from './node.service';

@Controller('nodes')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  /**
   * PATCH /nodes/batch
   *
   * Handles multiple node position updates in a single transaction.
   */
  @Patch('batch')
  async batchUpdate(@Body() data: { updates: BatchNodeUpdate[] }) {
    if (!data.updates || !Array.isArray(data.updates)) {
      return { success: false, message: 'Invalid payload. Expected an array of updates.' };
    }

    const updatedNodes = await this.nodeService.batchUpdatePositions(data.updates);

    return {
      success: true,
      message: `Successfully updated ${updatedNodes.length} nodes`,
      data: updatedNodes,
    };
  }
}
