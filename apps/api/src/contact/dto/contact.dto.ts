import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ContactDto {
  @IsNotEmpty({ message: 'Type is required' })
  @IsIn(['help', 'feature-request', 'feedback'], { message: 'Invalid form type' })
  type: 'help' | 'feature-request' | 'feedback';

  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsNotEmpty({ message: 'Message is required' })
  @IsString()
  message: string;
}
