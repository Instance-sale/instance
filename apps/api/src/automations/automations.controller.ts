import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  CreateFolderDto,
  ExecuteAutomationDto,
  SaveNodesDto,
  } from './dto/automations.dto';

@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get('folders')
  async getFolders(
    @CurrentUser() user: any,
    @Query('instagramAccountId') instagramAccountId: string,
  ) {
    return this.automationsService.getFolders(
      user.companyId,
      instagramAccountId,
    );
  }

  @Post('folders')
  @Roles('OWNER')
  async createFolder(
    @CurrentUser() user: any,
    @Body() dto: CreateFolderDto,
  ) {
    return this.automationsService.createFolder(user.companyId, dto);
  }

  @Delete('folders/:id')
  @Roles('OWNER')
  async deleteFolder(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.automationsService.deleteFolder(user.companyId, id);
  }

  @Get()
  async getAutomations(
    @CurrentUser() user: any,
    @Query('folderId') folderId?: string,
    @Query('instagramAccountId') instagramAccountId?: string,
  ) {
    return this.automationsService.getAutomations(user.companyId, folderId, instagramAccountId);
  }

  @Post()
  @Roles('OWNER')
  async createAutomation(
    @CurrentUser() user: any,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationsService.createAutomation(user.companyId, dto);
  }

  @Get(':id')
  async getAutomation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.automationsService.getAutomation(user.companyId, id);
  }

  @Patch(':id')
  @Roles('OWNER')
  async updateAutomation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.updateAutomation(user.companyId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  async deleteAutomation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.automationsService.deleteAutomation(user.companyId, id);
  }

  @Post(':id/nodes')
  @Roles('OWNER')
  async saveNodes(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SaveNodesDto,
  ) {
    return this.automationsService.saveNodes(user.companyId, id, dto.nodes);
  }

  @Get(':id/stats')
  async getAutomationStats(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.automationsService.getAutomationStats(user.companyId, id);
  }

  @Get(':id/analytics')
  async getAutomationAnalytics(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.automationsService.getAutomationAnalytics(user.companyId, id);
  }

  @Get(':id/executions')
  async getAutomationExecutions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationsService.getAutomationExecutions(
      user.companyId,
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post(':id/duplicate')
  @Roles('OWNER')
  async duplicateAutomation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.automationsService.duplicateAutomation(user.companyId, id);
  }

  @Post('execute')
  @Roles('OWNER')
  async executeAutomation(
    @CurrentUser() user: any,
    @Body() dto: ExecuteAutomationDto,
  ) {
    return this.automationsService.executeAutomation(user.companyId, dto);
  }
}
