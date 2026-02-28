import { IsOptional, IsString, MinLength } from 'class-validator';

export class UploadToProjectDto {
    @IsString()
    @MinLength(1)
    fileContent: string = '';

    @IsOptional()
    @IsString()
    fileName?: string;
}
