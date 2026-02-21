import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for uploading raw GEDCOM file content.
 */
export class UploadGedcomDto {
    /**
     * The raw text content of the .ged file.
     */
    @IsString()
    @IsNotEmpty({ message: 'File content must not be empty' })
    readonly fileContent!: string;

    /**
     * Optional original filename for reference.
     */
    @IsString()
    readonly fileName?: string;
}
