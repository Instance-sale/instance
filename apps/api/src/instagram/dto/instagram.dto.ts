import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InstagramOAuthDto {
  @IsOptional()
  @IsString()
  setupMode?: string;
}

export class InstagramMediaQueryDto {
  @IsString()
  accountId: string;

  @IsOptional()
  @IsString()
  type?: 'post' | 'reel' | 'story' | 'all' = 'all';

  @IsOptional()
  limit?: number = 25;

  @IsOptional()
  @IsString()
  after?: string;
}

export class InstagramProfilesQueryDto {
  @IsString()
  accountId: string;

  @IsOptional()
  limit?: number = 50;

  @IsOptional()
  offset?: number = 0;

  @IsOptional()
  @IsString()
  qualifiedOnly?: string;
}

export class DisconnectAccountDto {
  @IsOptional()
  @IsString()
  accountId?: string;
}

export class RetryJobsDto {
  @IsOptional()
  @IsString({ each: true })
  jobIds?: string[];
}

export class FailedJobsQueryDto {
  @IsOptional()
  limit?: number = 50;

  @IsOptional()
  offset?: number = 0;
}

export class IcebreakerItemDto {
  @IsString()
  question: string;

  @IsString()
  payload: string;

  @IsOptional()
  @IsString()
  automationId?: string;
}

export class UpdateIcebreakersDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IcebreakerItemDto)
  icebreakers: IcebreakerItemDto[];
}

export class IcebreakersQueryDto {
  @IsOptional()
  @IsString()
  accountId?: string;
}

