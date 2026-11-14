import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ManageHealthDto } from './dto/manage-health.dto';

@Controller('admin')
@Roles('OWNER')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('account-health')
  async getAccountHealth(
    @CurrentUser() user: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.adminService.getAccountHealth(user.id, accountId);
  }

  @Post('account-health')
  async manageAccountHealth(
    @CurrentUser() user: any,
    @Body() dto: ManageHealthDto,
  ) {
    return this.adminService.manageAccountHealth(user.id, dto);
  }
}
