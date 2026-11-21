import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsNotEmpty({ message: 'API key name is required' })
  @IsString()
  @MaxLength(50, { message: 'API key name cannot exceed 50 characters' })
  name: string;
}
