import { IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailListQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  audienceListId?: string;

  @IsOptional()
  @IsIn(['all', 'email', 'phone', 'both'])
  channelFilter?: 'all' | 'email' | 'phone' | 'both' = 'all';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

