import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — Apply this guard to any controller or route handler
 * that requires a valid Supabase Auth JWT.
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
 * On failure: returns HTTP 401 Unauthorized automatically.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase-jwt') {}
