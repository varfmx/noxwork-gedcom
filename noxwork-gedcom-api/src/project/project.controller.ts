import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { RenameProjectDto } from './dto/rename-project.dto';

/**
 * ProjectController — REST endpoints for genealogy project management.
 *
 * All routes require a valid Supabase Auth JWT (`Authorization: Bearer <token>`).
 * Ownership is enforced in ProjectService — users can only access their own data.
 *
 * Routes:
 *   GET    /api/projects           → list all projects for the caller
 *   POST   /api/projects           → create a new empty project
 *   PATCH  /api/projects/:id       → rename a project
 *   DELETE /api/projects/:id       → delete a project (cascade)
 */
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    /**
     * GET /api/projects
     *
     * Returns all genealogy projects belonging to the authenticated user,
     * ordered by most recently updated.
     *
     * Response includes:
     *   - id, name, description
     *   - nodeCount: number of Person records
     *   - edgeCount: number of Relationship records
     *   - createdAt, updatedAt
     */
    @Get()
    async findAll(@GetUser() user: AuthenticatedUser) {
        const projects = await this.projectService.findAllForUser(user.id);

        return {
            success: true,
            data: projects,
        };
    }

    /**
     * POST /api/projects
     *
     * Creates a new empty genealogy project for the authenticated user.
     * Automatically upserts the User row to handle first-time SSO sign-ins.
     *
     * Body: { name: string, description?: string }
     */
    @Post()
    async create(
        @GetUser() user: AuthenticatedUser,
        @Body() dto: CreateProjectDto,
    ) {
        const project = await this.projectService.create(user, dto);

        return {
            success: true,
            message: `Project "${project.name}" created successfully.`,
            data: project,
        };
    }

    /**
     * PATCH /api/projects/:id
     *
     * Renames an existing project. Returns the updated project summary.
     * Returns 404 if the project does not exist for the caller.
     * Returns 403 if the project exists but belongs to another user.
     *
     * Body: { name: string }
     */
    @Patch(':id')
    async rename(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Body() dto: RenameProjectDto,
    ) {
        const project = await this.projectService.rename(userId, projectId, dto);

        return {
            success: true,
            message: `Project renamed to "${project.name}".`,
            data: project,
        };
    }

    /**
     * DELETE /api/projects/:id
     *
     * Deletes a project and all its associated Person and Relationship records
     * (Prisma cascade handles this via the `onDelete: Cascade` directives in
     * the schema).
     *
     * Returns 404 if the project does not exist for the caller.
     * Returns 403 if the project exists but belongs to another user.
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
    ): Promise<void> {
        await this.projectService.delete(userId, projectId);
    }
}
