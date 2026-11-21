import { IsNotEmpty, IsOptional, IsString, IsArray, IsEmail } from 'class-validator';

export class V1CreateContactDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class V1UpdateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class V1UpdateTagsDto {
  @IsNotEmpty({ message: 'tags array is required' })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class V1UpdateStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsString()
  status: string;
}
