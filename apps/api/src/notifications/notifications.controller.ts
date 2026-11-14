import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private getCompanyId(user: any): string {
    const companyId =
      user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return companyId;
  }

  @Get()
  async getNotifications(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = this.getCompanyId(user);
    const parsedIsRead =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : 30;

    return this.notificationsService.getNotifications(companyId, {
      type,
      isRead: parsedIsRead,
      limit: parsedLimit,
    });
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.notificationsService.markAsRead(companyId, id);
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    const companyId = this.getCompanyId(user);
    return this.notificationsService.markAllAsRead(companyId);
  }
}
