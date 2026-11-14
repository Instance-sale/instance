import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SyncUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  provider?: string;
}
