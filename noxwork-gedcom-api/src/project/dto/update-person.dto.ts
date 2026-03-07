import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * DTO for PATCH /api/projects/:projectId/persons/:personId
 * Updates an existing Person's details.
 */
export class UpdatePersonDto {
    @IsOptional()
    @IsString()
    firstName?: string;

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
