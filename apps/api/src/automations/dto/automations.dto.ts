import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsArray, IsObject } from 'class-validator';

export class CreateAutomationDto {
  @IsNotEmpty({ message: 'folderId is required' })
  @IsString()
  folderId: string;

  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'triggerType is required' })
  @IsString()
  triggerType: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerKeywords?: string[];

  @IsOptional()
  @IsString()
  triggerMatchType?: string;

  @IsOptional()
  @IsArray()
  nodes?: any[];
}

export class UpdateAutomationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  flowData?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerKeywords?: string[];

  @IsOptional()
  @IsString()
  triggerMatchType?: string;

  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @IsOptional()
  @IsString()
  triggerType?: string;
}

export class CreateFolderDto {
  @IsNotEmpty({ message: 'instagramAccountId is required' })
  @IsString()
  instagramAccountId: string;

  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ExecuteAutomationDto {
  @IsNotEmpty({ message: 'automationId is required' })
  @IsString()
  automationId: string;

  @IsNotEmpty({ message: 'instagramUserId is required' })
  @IsString()
  instagramUserId: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class SendChatMessageDto {
  @IsNotEmpty({ message: 'conversationId is required' })
  @IsString()
  conversationId: string;

  @IsNotEmpty({ message: 'text is required' })
  @IsString()
  text: string;
}

export class SaveNodesDto {
  @IsNotEmpty({ message: 'nodes is required' })
  @IsArray()
  nodes: any[];
}

