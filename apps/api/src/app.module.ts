import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { CompanyModule } from './company/company.module';
import { CrmModule } from './crm/crm.module';
import { UploadModule } from './upload/upload.module';
import { ContactModule } from './contact/contact.module';
import { AdminModule } from './admin/admin.module';
import { InstagramModule } from './instagram/instagram.module';
import { AutomationsModule } from './automations/automations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CronModule } from './cron/cron.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DebugModule } from './debug/debug.module';
import { RedisModule } from './redis/redis.module';
import { NextAuthSessionGuard } from './common/guards/next-auth-session.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    CompanyModule,
    CrmModule,
    UploadModule,
    ContactModule,
    AdminModule,
    InstagramModule,
    AutomationsModule,
    AnalyticsModule,
    CronModule,
    NotificationsModule,
    DebugModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: NextAuthSessionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

