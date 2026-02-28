import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces';

/**
 * @GetUser() — Extracts the authenticated user from the request object.
 *
 * Populated by `SupabaseJwtStrategy.validate()` after a successful JWT check.
 *
 * Usage:
 *   async findAll(@GetUser() user: AuthenticatedUser) { ... }
 *
 *   // Extract a single field:
 *   async getProjects(@GetUser('id') userId: string) { ... }
 */
export const GetUser = createParamDecorator(
    (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
        const user = request.user;
        return field ? user?.[field] : user;
    },
);
