import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces';
import { PrismaService } from '../prisma/prisma.service';

/**
 * UsersController — Endpoints for the authenticated user's own profile data.
 *
 * Routes:
 *   GET /api/users/me → returns the Prisma User row for the caller
 */
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * GET /api/users/me
     *
     * Returns the Prisma User profile for the authenticated caller.
     * The row is guaranteed to exist because UserSyncService upserts it
     * on every valid JWT request before this handler is reached.
     *
     * Response:
     *   { success: true, data: { id, email, firstName, lastName } }
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
            },
        });

        return {
            success: true,
            data: profile,
        };
    }
}
