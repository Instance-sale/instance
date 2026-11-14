import { Controller, Get, Post, Body } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async getCompany(@CurrentUser() user: any) {
    return this.companyService.getCompany(user.id);
  }

  @Post()
  async createCompany(
    @CurrentUser() user: any,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companyService.createCompany(user.id, dto);
  }

  @Post('progress')
  @Roles('OWNER')
  async saveProgress(
    @CurrentUser() user: any,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.saveProgress(user.id, dto);
  }
}
