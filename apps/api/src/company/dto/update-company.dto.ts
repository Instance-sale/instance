import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() instagramHandle?: string;
  @IsOptional() @IsString() ownerName?: string;
  @IsOptional() @IsString() ownerRole?: string;
  @IsOptional() @IsNumber() numberOfEmployees?: number;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsString() companyEmail?: string;
  @IsOptional() @IsString() companyImage?: string;
  @IsOptional() @IsString() companyDescription?: string;
  @IsOptional() @IsBoolean() setupComplete?: boolean;
  @IsOptional() @IsBoolean() createNewAccount?: boolean;
}
