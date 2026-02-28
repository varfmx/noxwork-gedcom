import {
    Injectable,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

/**
 * JwtAuthGuard — Apply this guard to any controller or route handler
 * that requires a valid Supabase Auth JWT.
 *
 * Security validations (all handled by SupabaseJwtStrategy + this guard):
 *  1. Bearer token present in Authorization header
 *  2. Token signature verified via Supabase JWKS endpoint (ES256 / RS256)
 *  3. Token not expired (`exp` claim)
 *  4. Role === 'authenticated' (rejects anon/service-role tokens)
 *  5. Post-password-reset sessions: handled automatically — Supabase issues
 *     a new JWT after reset; old tokens expire naturally or are invalidated
 *     server-side. The JWKS verification ensures only valid Supabase-issued
 *     tokens are accepted regardless of when the token was issued.
 *
 * Usage (controller-level):
 *   @UseGuards(JwtAuthGuard)
 *   @Controller('projects')
 *
 * Usage (single route):
 *   @UseGuards(JwtAuthGuard)
 *   @Get()
 *   findAll() { ... }
 *
 * On failure: returns HTTP 401 Unauthorized.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase-jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    /**
     * Passport calls this after validate() returns.
     * We override it to provide structured logging on auth failures.
     */
    handleRequest<TUser = unknown>(
        err: Error | null,
        user: TUser | false,
        info: { message?: string } | undefined,
        context: ExecutionContext,
    ): TUser {
        const req = context.switchToHttp().getRequest<{ method: string; url: string }>();

        if (err || !user) {
            const reason = err?.message ?? info?.message ?? 'No token provided';
            this.logger.warn(
                `[401] ${req.method} ${req.url} — ${reason}`,
            );
            throw new UnauthorizedException(
                err?.message ?? 'Authentication required. Please sign in.',
            );
        }

        return user as TUser;
    }
}

