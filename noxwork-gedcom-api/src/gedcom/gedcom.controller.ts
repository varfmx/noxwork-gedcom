import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Patch,
    Delete,
} from '@nestjs/common';
import { GedcomService } from './gedcom.service';
import { UploadGedcomDto } from './dto';

/**
 * GedcomController — Handles HTTP requests for GEDCOM operations.
 */
@Controller('gedcom')
export class GedcomController {
    constructor(private readonly gedcomService: GedcomService) { }

    /**
     * POST /gedcom/upload
     *
     * Receives raw GEDCOM file content, parses it, and returns
     * the structured JSON result with a session ID for future retrieval.
     */
    @Post('upload')
    @HttpCode(HttpStatus.OK)
    async uploadGedcom(@Body() dto: UploadGedcomDto) {
        const { sessionId, result, stats } = await this.gedcomService.parseFile(
            dto.fileContent,
        );

        return {
            success: true,
            message: `Successfully parsed GEDCOM file with ${stats.individualsCount} individuals and ${stats.familiesCount} families`,
            data: {
                sessionId,
                stats,
                individuals: Object.values(result.individuals),
                families: Object.values(result.families),
                metadata: result.metadata,
            },
        };
    }

    /**
     * GET /gedcom/session/:id
     *
     * Retrieves a previously parsed GEDCOM result by session ID.
     */
    @Get('session/:id')
    async getSession(@Param('id') id: string) {
        const result = await this.gedcomService.getSession(id);

        if (!result) {
            return {
                success: false,
                message: 'Session not found',
                data: null,
            };
        }

        return {
            success: true,
            data: {
                individuals: Object.values(result.individuals),
                families: Object.values(result.families),
                metadata: result.metadata,
            },
        };
    }

    /**
     * PATCH /gedcom/node/:id
     *
     * Updates a person's details or coordinates.
     */
    @Patch('node/:id')
    async updateNode(@Param('id') id: string, @Body() data: any) {
        const updatedNode = await this.gedcomService.updateNode(id, data);
        return { success: true, data: updatedNode };
    }

    /**
     * POST /gedcom/relationship
     *
     * Creates a new connection between two existing nodes.
     */
    @Post('relationship')
    async createRelationship(@Body() data: { treeId: string; type: string; subType?: string; sourceId: string; targetId: string }) {
        const relationship = await this.gedcomService.createRelationship(data);
        return { success: true, data: relationship };
    }

    /**
     * DELETE /gedcom/node/:id
     *
     * Removes a person and all their associated relationships.
     */
    @Delete('node/:id')
    async deleteNode(@Param('id') id: string) {
        await this.gedcomService.deleteNode(id);
        return { success: true, message: 'Node deleted successfully' };
    }
}
