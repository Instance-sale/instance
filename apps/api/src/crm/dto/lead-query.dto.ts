import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LeadQueryDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  qualified?: string;

  @IsOptional()
  @IsString()
  needsFollowUp?: string;

  @IsOptional()
  @IsString()
  interactionType?: 'FOLLOW' | 'DM' | 'COMMENT' | 'STORY' | 'all';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @IsOptional()
  @IsString()
  hasWebsite?: string;

  @IsOptional()
  @IsString()
  isVerified?: string;

  @IsOptional()
  @IsString()
  isBusinessAccount?: string;

  @IsOptional()
  @IsString()
  export?: 'csv' | 'xml';

  @IsOptional()
  @IsString()
  fields?: string;

  @IsOptional()
  @IsString()
  isDefaultStatus?: string;
}
