import { IsOptional, IsString, IsBoolean, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAudienceListDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class UpdateAudienceListDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsNumber()
  pinnedOrder?: number;
}

export class ReassignContactAudienceListDto {
  @IsString()
  contactCaptureId!: string;

  @IsString()
  audienceListId!: string;

  @IsOptional()
  @IsIn(['assign', 'unassign', 'set'])
  action?: 'assign' | 'unassign' | 'set' = 'set';
}

export class BulkAssignAudienceListDto {
  @IsString({ each: true })
  contactCaptureIds!: string[];

  @IsString()
  audienceListId!: string;

  @IsOptional()
  @IsIn(['assign', 'move', 'remove'])
  action?: 'assign' | 'move' | 'remove' = 'assign';
}
