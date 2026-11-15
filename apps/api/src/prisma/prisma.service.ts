import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { prisma, PrismaClient } from '@instance/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: PrismaClient = prisma;

  async onModuleInit() {
    try {
      await this.client.$connect();
      this.logger.log('PrismaService connected to PostgreSQL database successfully.');
    } catch (error) {
      this.logger.error('Failed to connect to database via PrismaService:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    this.logger.log('PrismaService disconnected from database.');
  }

  // Model accessors matching schema.prisma
  get user() { return this.client.user; }
  get company() { return this.client.company; }
  get account() { return this.client.account; }
  get session() { return this.client.session; }
  get instagramAccount() { return this.client.instagramAccount; }
  get instagramAccountHealth() { return this.client.instagramAccountHealth; }
  get instagramUserProfile() { return this.client.instagramUserProfile; }
  get contactCapture() { return this.client.contactCapture; }
  get automation() { return this.client.automation; }
  get automationFolder() { return this.client.automationFolder; }
  get automationNode() { return this.client.automationNode; }
  get automationExecution() { return this.client.automationExecution; }
  get verificationToken() { return this.client.verificationToken; }
  get executionStep() { return this.client.executionStep; }
  get queueJob() { return this.client.queueJob; }
  get apiErrorLog() { return this.client.apiErrorLog; }
  get backgroundJob() { return this.client.backgroundJob; }
  get $transaction() { return this.client.$transaction.bind(this.client); }
  get $queryRaw() { return this.client.$queryRaw.bind(this.client); }
  get storyMention() { return this.client.storyMention; }
  get notification() { return this.client.notification; }
  get audienceList() { return (this.client as any).audienceList; }
  get audienceListMember() { return (this.client as any).audienceListMember; }
}


