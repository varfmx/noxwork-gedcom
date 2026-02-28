import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, AuthenticatedUser } from './interfaces';

/**
 * SupabaseJwtStrategy — validates Bearer tokens issued by Supabase Auth.
 *
 * Supabase signs JWTs with HS256 using the project's JWT secret
 * (`Settings → API → JWT Secret` in the Supabase dashboard).
 * Set it as `SUPABASE_JWT_SECRET` in your `.env` file.
 *
 * Validation logic:
 *  1. passport-jwt automatically verifies the signature, `iat`, and `exp`.
 *  2. We additionally assert that `role === 'authenticated'` to reject
 *     anon/service-role tokens from reaching project endpoints.
 *
 * The returned object is attached to `request.user` as `AuthenticatedUser`.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
    Strategy,
    'supabase-jwt',
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.SUPABASE_JWT_SECRET ?? '',
        });

        if (!process.env.SUPABASE_JWT_SECRET) {
            throw new Error(
                '[AuthModule] SUPABASE_JWT_SECRET env variable is not set. ' +
                'Add it to your .env file (Supabase Dashboard → Settings → API → JWT Secret).',
            );
        }
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
