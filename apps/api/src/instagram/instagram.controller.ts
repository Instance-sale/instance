import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Headers,
  Body,
  Patch,
  Delete,
  Param,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InstagramService } from './instagram.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  InstagramMediaQueryDto,
  InstagramProfilesQueryDto,
  IcebreakersQueryDto,
  UpdateIcebreakersDto,
} from './dto/instagram.dto';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) { }

  private getCompanyId(user: any): string {
    const companyId = user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return companyId;
  }

  @Get('auth')
  @Roles('OWNER')
  async initiateAuth(
    @CurrentUser() user: any,
    @Query('setupMode') setupMode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const url = this.instagramService.getOAuthUrl(user.id, setupMode, origin);
    return res.redirect(url);
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = `${req.protocol}://${req.get('host')}`;
    const redirectUrl = await this.instagramService.handleOAuthCallback(
      code,
      state,
      origin,
    );
    return res.redirect(redirectUrl);
  }

  @Get('accounts')
  async getAccounts(@CurrentUser() user: any) {
    return this.instagramService.getAccounts(user.id);
  }

  @Post('disconnect')
  @Roles('OWNER')
  async disconnect() {
    return this.instagramService.disconnectAccount();
  }

  @Get('media')
  async getMedia(
    @CurrentUser() user: any,
    @Query() query: InstagramMediaQueryDto,
  ) {
    return this.instagramService.getMedia(
      user.id,
      query.accountId,
      query.type,
      Number(query.limit) || 25,
      query.after,
    );
  }

  @Get('profiles')
  async getProfiles(
    @CurrentUser() user: any,
    @Query() query: InstagramProfilesQueryDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.instagramService.getProfiles(
      companyId,
      query.accountId,
      Number(query.limit) || 50,
      Number(query.offset) || 0,
    );
  }

  @Get('story-mentions')
  async getStoryMentions(
    @CurrentUser() user: any,
    @Query('accountId') accountId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.instagramService.getStoryMentions(
      companyId,
      accountId,
      status,
      Number(limit) || 50,
    );
  }

  @Patch('story-mentions/:id')
  @Roles('OWNER')
  async updateStoryMentionStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('repostStatus') repostStatus: string,
  ) {
    const companyId = this.getCompanyId(user);
    return this.instagramService.updateStoryMentionStatus(
      companyId,
      id,
      repostStatus,
    );
  }

  @Get('icebreakers')
  async getIcebreakers(
    @CurrentUser() user: any,
    @Query() query: IcebreakersQueryDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.instagramService.getIcebreakers(companyId, query?.accountId);
  }

  @Post('icebreakers')
  @Roles('OWNER')
  async updateIcebreakers(
    @CurrentUser() user: any,
    @Body() dto: UpdateIcebreakersDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.instagramService.updateIcebreakers(companyId, dto);
  }

  @Delete('icebreakers')
  @Roles('OWNER')
  async deleteIcebreakers(
    @CurrentUser() user: any,
    @Query() query: IcebreakersQueryDto,
  ) {
    const companyId = this.getCompanyId(user);
    return this.instagramService.deleteIcebreakers(companyId, query?.accountId);
  }

  @Public()
  @Post('data-deletion')
  async dataDeletion() {
    return {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.instance.sale'}/privacy`,
      confirmation_code: `del_${Date.now()}`,
    };
  }

  @Public()
  @Post('deauthorize')
  async deauthorize() {
    return { success: true };
  }
}

@Controller(['webhooks/instagram', 'webhook/instagram'])
export class InstagramWebhooksController {
  private readonly logger = new Logger(InstagramWebhooksController.name);
  constructor(private readonly instagramService: InstagramService) { }

  @Public()
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!expectedToken) {
      return res.status(403).json({ error: 'Webhook verify token not configured' });
    }

    if (mode === 'subscribe' && token === expectedToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  @Public()
  @Post()
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    const isValid = this.instagramService.verifyWebhookSignature(rawBody, signature);
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;

    if (appSecret) {
      if (!signature || !isValid) {
        throw new UnauthorizedException('Invalid or missing signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Webhook secret not configured on server');
    }

    // Decouple webhook processing from request thread: respond immediately to prevent Meta timeout
    void this.instagramService.processWebhookEvent(body).catch((err) => {
      console.error('[InstagramWebhook] Error processing webhook event:', err);
    });
    return { status: 'ok' };
  }

  @Get('debug')
  async getDebug(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const companyId = user?.companyId || user?.company?.id || user?.ownedCompanies?.[0]?.id;
    if (!companyId) {
      throw new UnauthorizedException('Company required');
    }
    return this.instagramService.getWebhookDebug(
      companyId,
      Number(limit) || 50,
    );
  }
}
