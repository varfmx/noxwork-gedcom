import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * AuthModule — Registers the Supabase JWT Passport strategy globally.
 *
 * Import this module once in `AppModule`.
 * Any controller that adds `@UseGuards(JwtAuthGuard)` will then
 * validate Bearer tokens against the Supabase JWT secret automatically.
 */
@Module({
    imports: [PassportModule.register({ defaultStrategy: 'supabase-jwt' })],
    providers: [SupabaseJwtStrategy, JwtAuthGuard],
    exports: [JwtAuthGuard, PassportModule],
})
export class AuthModule {}
