import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class V1TriggerAutomationDto {
  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class V1SendMessageDto {
  @IsNotEmpty({ message: 'contactId is required' })
  @IsString()
  contactId: string;

  @IsNotEmpty({ message: 'text is required' })
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
