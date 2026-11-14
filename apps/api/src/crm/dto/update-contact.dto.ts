import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateContactDto {
  @IsNotEmpty({ message: 'Profile ID is required' })
  @IsString()
  profileId: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
