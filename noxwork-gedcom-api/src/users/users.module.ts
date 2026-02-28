import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

/**
 * UsersModule — Exposes the authenticated user's own profile data.
 *
 * PrismaService is available globally (via the @Global PrismaModule),
 * so no extra imports are needed here.
 */
@Module({
    controllers: [UsersController],
})
export class UsersModule {}
