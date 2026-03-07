import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * DTO for POST /api/projects/:id/relationships
 * Creates a new Relationship between two Persons.
 */
export class CreateRelationshipDto {
    @IsIn(['PARENT', 'SPOUSE', 'SIBLING'])
    type!: string;

    @IsOptional()
    @IsString()
    subType?: string;

    @IsString()
    sourceId!: string;

    @IsString()
    targetId!: string;
}
