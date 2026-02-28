import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { JwtPayload, AuthenticatedUser } from './interfaces';
import { UserSyncService } from './user-sync.service';

/**
 * SupabaseJwtStrategy — validates Bearer tokens issued by Supabase Auth.
 *
 * Newer Supabase projects sign JWTs with ES256 using asymmetric keys.
 * We verify using the JWKS endpoint: {SUPABASE_URL}/auth/v1/.well-known/jwks.json
 *
 * Set SUPABASE_URL in your environment variables.
 *
 * Validation logic:
 *  1. jwks-rsa fetches the public key matching the token's `kid`.
 *  2. passport-jwt verifies the signature, `iat`, and `exp`.
 *  3. We additionally assert that `role === 'authenticated'` to reject
 *     anon/service-role tokens from reaching project endpoints.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
    Strategy,
    'supabase-jwt',
) {
    constructor(private readonly userSync: UserSyncService) {
        const supabaseUrl = process.env.SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error(
                '[AuthModule] SUPABASE_URL env variable is not set.',
            );
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 10,
                jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            }),
            algorithms: ['ES256', 'RS256'],
        });
    }

    /**
     * Called by Passport after signature + expiry are verified.
     * Must return the value that will be attached to `request.user`.
     *
     * We fire-and-forget the user sync here so the Prisma User row is always
     * kept current after every valid JWT is received, without adding latency
     * to the request (errors are swallowed inside syncUser).
     */
    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (payload.role !== 'authenticated') {
            throw new UnauthorizedException(
                'Token role must be "authenticated". ' +
                'Anon and service-role tokens are not accepted.',
            );
        }

        // Sync user metadata to the Prisma User table on every valid request.
        // syncUser catches its own errors, so this never throws.
        await this.userSync.syncUser(payload);

        return {
            id: payload.sub,
            email: payload.email,
        };
    }
}
