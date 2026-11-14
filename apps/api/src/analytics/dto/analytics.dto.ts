import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeRangeDto {
  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom' = 'month';

  @IsNotEmpty()
  start: string | Date;

  @IsNotEmpty()
  end: string | Date;
}

export class AnalyticsRequestDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  timeRange: TimeRangeDto;
}
