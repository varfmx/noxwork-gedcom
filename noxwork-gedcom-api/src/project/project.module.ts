import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { GedcomExporterService } from './gedcom-exporter.service';

/**
 * ProjectModule — Encapsulates CRUD for genealogy projects.
 *
 * Imports `AuthModule` to make `JwtAuthGuard` available. PrismaService is
 * globally provided by `PrismaModule` (registered in `AppModule`),
 * so it does not need to be re-imported here.
 */
@Module({
    imports: [AuthModule],
    controllers: [ProjectController],
    providers: [ProjectService, GedcomExporterService],
    exports: [ProjectService, GedcomExporterService],
})
export class ProjectModule {}
