import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class PositionUpdate {
    @IsString()
    id!: string;

    @IsNumber()
    positionX!: number;

    @IsNumber()
    positionY!: number;
}

/**
 * DTO for PATCH /api/projects/:id/positions
 * Batch-updates node positions within a project.
 */
export class BatchUpdatePositionsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PositionUpdate)
    updates!: PositionUpdate[];
}
