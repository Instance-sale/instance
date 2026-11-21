import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiKeysService } from '../services/api-keys.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';

@Controller('api-keys')
export class ApiKeysInternalController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  private getCompanyId(user: any): string {
    const companyId = user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return companyId;
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MAINTAINER')
  async listKeys(@CurrentUser() user: any) {
    const companyId = this.getCompanyId(user);
    const keys = await this.apiKeysService.listKeys(companyId);
    return {
      status: 'success',
      data: keys,
    };
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async createKey(@CurrentUser() user: any, @Body() dto: CreateApiKeyDto) {
    const companyId = this.getCompanyId(user);
    const created = await this.apiKeysService.createKey(companyId, dto.name);
    return {
      status: 'success',
      data: created,
    };
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async revokeKey(@CurrentUser() user: any, @Param('id') id: string) {
    const companyId = this.getCompanyId(user);
    const result = await this.apiKeysService.revokeKey(companyId, id);
    return {
      status: 'success',
      data: result,
    };
  }
}
