import {
    Body,
    Controller,
    Get,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * UsersController — Endpoints for the authenticated user's own profile data.
 *
 * Routes:
 *   GET   /api/users/me → returns the Prisma User row for the caller
 *   PATCH /api/users/me → updates mutable profile fields (currently: language)
 */
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * GET /api/users/me
     *
     * Returns the Prisma User profile for the authenticated caller.
     * Row is guaranteed to exist because UserSyncService upserts it
     * on every valid JWT request.
     *
     * Response:
     *   { success: true, data: { id, email, firstName, lastName, language } }
     */
    @Get('me')
    async getMe(@GetUser() user: AuthenticatedUser) {
        const profile = await this.prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                language: true,
            },
        });

        return { success: true, data: profile };
    }

    /**
     * PATCH /api/users/me
     *
     * Updates mutable user profile fields (currently `language`).
     * Called by the frontend LanguageSwitcher when the user changes
     * their interface language.
     *
     * Body: { language: "en" | "es" }
     */
    @Patch('me')
    async updateMe(
        @GetUser() user: AuthenticatedUser,
        @Body() dto: UpdateUserDto,
    ) {
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: { language: dto.language },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                language: true,
            },
        });

        return { success: true, data: updated };
    }
}
