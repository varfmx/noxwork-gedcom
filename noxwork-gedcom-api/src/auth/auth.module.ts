import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserSyncService } from './user-sync.service';
import { MailModule } from '../mail/mail.module';

/**
 * AuthModule — Registers the Supabase JWT Passport strategy globally.
 *
 * Import this module once in `AppModule`.
 * Any controller that adds `@UseGuards(JwtAuthGuard)` will then
 * validate Bearer tokens against the Supabase JWT secret automatically.
 *
 * UserSyncService is provided here so the strategy can upsert Prisma User
 * rows on every valid JWT. PrismaService is available globally via PrismaModule.
 * MailModule is imported so UserSyncService can send Welcome emails on first login.
 */
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'supabase-jwt' }),
        MailModule,
    ],
    providers: [SupabaseJwtStrategy, JwtAuthGuard, UserSyncService],
    exports: [JwtAuthGuard, PassportModule, UserSyncService],
})
export class AuthModule {}

