import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './interfaces';

/**
 * Extracts { firstName, lastName } from Supabase user_metadata.
 *
 * Priority order (handles both manual signup and Google SSO):
 *  1. `first_name` / `last_name`  — set by manual signup forms or custom metadata
 *  2. `full_name`                 — typically provided by Google OAuth
 *  3. `name`                      — fallback OAuth field used by some providers
 *
 * When only a full/display name is available the first whitespace-delimited
 * word becomes `firstName` and everything afterwards becomes `lastName`.
 */
function extractName(metadata: Record<string, unknown>): {
    firstName: string | null;
    lastName: string | null;
} {
    // 1. Explicit separate fields (manual signup)
    if (
        typeof metadata['first_name'] === 'string' ||
        typeof metadata['last_name'] === 'string'
    ) {
        return {
            firstName: (metadata['first_name'] as string) ?? null,
            lastName: (metadata['last_name'] as string) ?? null,
        };
    }

    // 2. Full name (Google SSO sends `full_name`, some providers send `name`)
    const fullName =
        (metadata['full_name'] as string | undefined) ??
        (metadata['name'] as string | undefined) ??
        null;

    if (!fullName?.trim()) {
        return { firstName: null, lastName: null };
    }

    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] ?? null;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;

    return { firstName, lastName };
}

/**
 * UserSyncService — keeps the Prisma `User` table in sync with Supabase Auth.
 *
 * Called once per request (inside the JWT strategy's `validate()` method)
 * immediately after the token is verified. Uses `upsert` so the operation
 * is idempotent and safe under concurrent requests.
 */
@Injectable()
export class UserSyncService {
    private readonly logger = new Logger(UserSyncService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Creates or updates the Prisma User row for the given Supabase JWT payload.
     *
     * - `id`    → payload.sub  (Supabase auth.users UUID)
     * - `email` → payload.email
     * - `firstName` / `lastName` → extracted from `user_metadata`
     *
     * The `firstName` / `lastName` are only updated when the extracted values
     * are non-null, so a user who previously set their name manually won't
     * have it wiped if metadata is temporarily absent.
     */
    async syncUser(payload: JwtPayload): Promise<void> {
        const metadata = (payload.user_metadata as Record<string, unknown>) ?? {};
        const { firstName, lastName } = extractName(metadata);

        try {
            await this.prisma.user.upsert({
                where: { id: payload.sub },
                create: {
                    id: payload.sub,
                    email: payload.email,
                    firstName,
                    lastName,
                },
                update: {
                    email: payload.email,
                    // Only overwrite name fields when Auth has data for them
                    ...(firstName !== null && { firstName }),
                    ...(lastName !== null && { lastName }),
                },
            });
        } catch (err) {
            // Log but never block the request — a sync failure must not
            // turn a valid JWT into a 500 or 401.
            this.logger.error(
                `Failed to sync user ${payload.sub}: ${(err as Error).message}`,
                (err as Error).stack,
            );
        }
    }
}
