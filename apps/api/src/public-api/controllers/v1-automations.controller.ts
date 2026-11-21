import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PublicApiKeyGuard } from '../guards/public-api-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationsService } from '../../automations/automations.service';
import { V1TriggerAutomationDto } from '../dto/v1-sending.dto';

@Controller('v1/automations')
@Public()
@UseGuards(PublicApiKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class V1AutomationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationsService: AutomationsService,
  ) {}

  @Post(':id/trigger')
  async triggerAutomation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: V1TriggerAutomationDto,
  ) {
    // 1. Verify automation exists in this company
    const automation = await this.prisma.automation.findFirst({
      where: {
        id,
        folder: { instagramAccount: { companyId: req.companyId } },
      },
    });

    if (!automation) {
      throw new NotFoundException({
        status: 'error',
        message: 'Automation flow not found in this workspace',
        code: 404,
      });
    }

    if (!dto.contactId && !dto.username) {
      throw new BadRequestException({
        status: 'error',
        message: 'Either contactId or username is required to trigger an automation',
        code: 400,
      });
    }

    // 2. Resolve target contact
    let profile: any = null;
    if (dto.contactId) {
      profile = await this.prisma.instagramUserProfile.findFirst({
        where: { id: dto.contactId, instagramAccount: { companyId: req.companyId } },
      });
    } else if (dto.username) {
      const cleanUsername = dto.username.replace(/^@/, '').trim();
      profile = await this.prisma.instagramUserProfile.findFirst({
        where: {
          username: { equals: cleanUsername, mode: 'insensitive' },
          instagramAccount: { companyId: req.companyId },
        },
      });
    }

    if (!profile) {
      throw new NotFoundException({
        status: 'error',
        message: 'Recipient contact not found in this workspace',
        code: 404,
      });
    }

    // 3. Dispatch execution
    const execution = await this.automationsService.executeAutomation(req.companyId, {
      automationId: automation.id,
      instagramUserId: profile.instagramUserId,
      variables: dto.variables || {},
    });

    return {
      status: 'success',
      data: {
        automation_id: automation.id,
        automation_name: automation.name,
        contact_id: profile.id,
        ig_username: profile.username,
        execution_id: execution?.executionId || 'queued',
        status: 'dispatched',
      },
    };
  }
}
