import { IsIn, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class ManageHealthDto {
  @IsNotEmpty({ message: 'Missing accountId or action' })
  @IsString()
  accountId: string;

  @IsNotEmpty({ message: 'Missing accountId or action' })
  @IsIn(['resume', 'pause'], { message: 'Invalid action. Use "resume" or "pause"' })
  action: 'resume' | 'pause';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  pauseHours?: number;
}
