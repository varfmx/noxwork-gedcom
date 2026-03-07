import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * DTO for POST /api/projects/:id/persons
 * Creates a new Person within a project.
 */
export class CreatePersonDto {
    @IsString()
    firstName!: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsIn(['M', 'F', 'U'])
    gender?: string;

    @IsOptional()
    @IsString()
    birthDate?: string;
}
