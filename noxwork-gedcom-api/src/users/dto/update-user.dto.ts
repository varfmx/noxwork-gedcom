import { IsIn, IsString } from 'class-validator';

const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export class UpdateUserDto {
    @IsString()
    @IsIn(SUPPORTED_LANGUAGES, {
        message: `language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
    })
    language!: SupportedLanguage;
}
