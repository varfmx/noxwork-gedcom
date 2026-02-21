import { Module } from '@nestjs/common';
import { GedcomController } from './gedcom.controller';
import { GedcomService } from './gedcom.service';
import { GEDCOM_REPOSITORY } from './repositories/gedcom.repository';
import { InMemoryGedcomRepository } from './repositories/in-memory-gedcom.repository';

/**
 * GedcomModule — Encapsulates all GEDCOM-related functionality.
 *
 * The repository is provided via a factory so that we can swap
 * InMemoryGedcomRepository for a PrismaGedcomRepository later
 * by simply changing the `useClass` value.
 */
@Module({
    controllers: [GedcomController],
    providers: [
        GedcomService,
        {
            provide: GEDCOM_REPOSITORY,
            useClass: InMemoryGedcomRepository,
        },
    ],
    exports: [GedcomService],
})
export class GedcomModule { }
