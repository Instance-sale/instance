import { IsNotEmpty, IsString, IsOptional, IsIn, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class V1CreateAudienceListDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class V1QueryAudienceContactsDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'email', 'phone', 'both'])
  channelFilter?: 'all' | 'email' | 'phone' | 'both' = 'all';

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  maxScore?: number;
}

export class V1AssignAudienceContactsDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  contactIds!: string[];
}
