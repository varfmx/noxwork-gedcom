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
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces';
import { ProjectService } from './project.service';
import { GedcomExporterService } from './gedcom-exporter.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { RenameProjectDto } from './dto/rename-project.dto';
import { UploadToProjectDto } from './dto/upload-to-project.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';

/**
 * ProjectController — REST endpoints for genealogy project management.
 *
 * All routes require a valid Supabase Auth JWT (`Authorization: Bearer <token>`).
 * Ownership is enforced in ProjectService — users can only access their own data.
 *
 * Routes:
 *   GET    /api/projects                          → list all projects for the caller
 *   POST   /api/projects                          → create a new empty project
 *   GET    /api/projects/:id                      → get full project detail (persons + relationships)
 *   POST   /api/projects/:id/upload               → parse & persist a GEDCOM file into a project
 *   GET    /api/projects/:id/export               → download project as .ged file
 *   PATCH  /api/projects/:id                      → rename a project
 *   DELETE /api/projects/:id                      → delete a project (cascade)
 *   POST   /api/projects/:id/persons              → create a new person
 *   PATCH  /api/projects/:id/persons/:personId    → update a person
 *   DELETE /api/projects/:id/persons/:personId    → delete a person
 *   POST   /api/projects/:id/relationships        → create a relationship
 */
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
    constructor(
        private readonly projectService: ProjectService,
        private readonly gedcomExporter: GedcomExporterService,
    ) { }

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
     * GET /api/projects/:id
     *
     * Returns a single project with all its Person and Relationship data,
     * reconstructed into the GedcomIndividual / GedcomFamily shapes the
     * frontend expects. This is the "hydration" endpoint used when a
     * user opens an existing project from the Dashboard.
     */
    @Get(':id')
    async findOne(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
    ) {
        const project = await this.projectService.findOneForUser(
            userId,
            projectId,
        );

        return {
            success: true,
            data: project,
        };
    }

    /**
     * POST /api/projects/:id/upload
     *
     * Parses a GEDCOM file and persists all individuals and families
     * into the database, linked to the specified project.
     * If the project already has data, existing records are replaced.
     *
     * Body: { fileContent: string, fileName?: string }
     */
    @Post(':id/upload')
    @HttpCode(HttpStatus.OK)
    async uploadToProject(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Body() dto: UploadToProjectDto,
    ) {
        const project = await this.projectService.uploadToProject(
            userId,
            projectId,
            dto,
        );

        return {
            success: true,
            message: `Successfully uploaded ${project.nodeCount} individuals and ${project.edgeCount} relationships.`,
            data: project,
        };
    }

    /**
     * GET /api/projects/:id/export
     *
     * Generates a GEDCOM 5.5.1 file from the project's stored Person and
     * Relationship records and streams it as a file download.
     *
     * Response headers:
     *   Content-Type: text/plain; charset=utf-8
     *   Content-Disposition: attachment; filename="<project-name>.ged"
     *
     * Returns 404 if the project does not exist for the authenticated user.
     */
    @Get(':id/export')
    async exportGedcom(
        @GetUser() user: AuthenticatedUser,
        @Param('id') projectId: string,
        @Res() res: Response,
    ): Promise<void> {
        const { filename, content } = await this.gedcomExporter.export(
            projectId,
            user.id,
        );

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`,
        );
        res.setHeader('Content-Length', Buffer.byteLength(content, 'utf-8'));
        res.send(content);
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

    // ── Person CRUD ──────────────────────────────────────────────────────────

    /**
     * POST /api/projects/:id/persons
     *
     * Creates a new Person within the specified project.
     * Body: { firstName: string, lastName?: string, gender?: string, birthDate?: string }
     */
    @Post(':id/persons')
    async createPerson(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Body() dto: CreatePersonDto,
    ) {
        const person = await this.projectService.createPerson(userId, projectId, dto);

        return {
            success: true,
            data: person,
        };
    }

    /**
     * PATCH /api/projects/:id/persons/:personId
     *
     * Updates an existing Person's details within the specified project.
     * Body: { firstName?: string, lastName?: string, gender?: string, birthDate?: string }
     */
    @Patch(':id/persons/:personId')
    async updatePerson(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Param('personId') personId: string,
        @Body() dto: UpdatePersonDto,
    ) {
        const person = await this.projectService.updatePerson(userId, projectId, personId, dto);

        return {
            success: true,
            data: person,
        };
    }

    /**
     * DELETE /api/projects/:id/persons/:personId
     *
     * Deletes a Person and all their associated Relationships.
     */
    @Delete(':id/persons/:personId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deletePerson(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Param('personId') personId: string,
    ): Promise<void> {
        await this.projectService.deletePerson(userId, projectId, personId);
    }

    // ── Relationship CRUD ────────────────────────────────────────────────────

    /**
     * POST /api/projects/:id/relationships
     *
     * Creates a new Relationship between two Persons in the project.
     * Body: { type: string, subType?: string, sourceId: string, targetId: string }
     */
    @Post(':id/relationships')
    async createRelationship(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Body() dto: CreateRelationshipDto,
    ) {
        const relationship = await this.projectService.createRelationship(userId, projectId, dto);

        return {
            success: true,
            data: relationship,
        };
    }
}
