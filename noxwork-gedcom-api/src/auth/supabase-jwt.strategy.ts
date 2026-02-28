import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { JwtPayload, AuthenticatedUser } from './interfaces';

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
    constructor() {
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
     */
    validate(payload: JwtPayload): AuthenticatedUser {
        if (payload.role !== 'authenticated') {
            throw new UnauthorizedException(
                'Token role must be "authenticated". ' +
                'Anon and service-role tokens are not accepted.',
            );
        }

        return {
            id: payload.sub,
            email: payload.email,
        };
    }
}
