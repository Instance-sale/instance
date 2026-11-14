import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramAuthService } from './services/instagram-auth.service';
import { InstagramMediaService } from './services/instagram-media.service';
import { InstagramCommentsService } from './services/instagram-comments.service';
import { InstagramWebhookRouterService } from './services/instagram-webhook-router.service';
import { InstagramAutomationRunnerService } from './services/instagram-automation-runner.service';
import { InstagramIcebreakersService } from './services/instagram-icebreakers.service';
import {
  InstagramController,
  InstagramWebhooksController,
} from './instagram.controller';
import { BackgroundJobsController } from './jobs.controller';

@Module({
  controllers: [
    InstagramController,
    InstagramWebhooksController,
    BackgroundJobsController,
  ],
  providers: [
    InstagramService,
    InstagramAuthService,
    InstagramMediaService,
    InstagramCommentsService,
    InstagramWebhookRouterService,
    InstagramAutomationRunnerService,
    InstagramIcebreakersService,
  ],
  exports: [InstagramService, InstagramAuthService, InstagramMediaService, InstagramCommentsService, InstagramWebhookRouterService, InstagramAutomationRunnerService, InstagramIcebreakersService],
})
export class InstagramModule {}

