import { IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateCompanyDto {
  @IsNotEmpty({ message: 'Company name is required' })
  @IsString()
  name: string;

  @IsOptional() @IsString() instagramHandle?: string;
  @IsOptional() @IsBoolean() createNewAccount?: boolean;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsString() ownerRole?: string;
  @IsOptional() @IsNumber() numberOfEmployees?: number;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsString() companyEmail?: string;
  @IsOptional() @IsString() companyImage?: string;
  @IsOptional() @IsString() companyDescription?: string;
  @IsOptional() @IsBoolean() setupComplete?: boolean;
}
