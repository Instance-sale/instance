import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrmModule } from '../crm/crm.module';
import { AutomationsModule } from '../automations/automations.module';
import { ApiKeysService } from './services/api-keys.service';
import { PublicApiKeyGuard } from './guards/public-api-key.guard';
import { ApiKeysInternalController } from './controllers/api-keys-internal.controller';
import { V1WorkspaceController } from './controllers/v1-workspace.controller';
import { V1ContactsController } from './controllers/v1-contacts.controller';
import { V1AutomationsController } from './controllers/v1-automations.controller';
import { V1AudienceController } from './controllers/v1-audience.controller';

@Module({
  imports: [
    PrismaModule,
    CrmModule,
    AutomationsModule,
  ],
  controllers: [
    ApiKeysInternalController,
    V1WorkspaceController,
    V1ContactsController,
    V1AutomationsController,
    V1AudienceController,
  ],
  providers: [
    ApiKeysService,
    PublicApiKeyGuard,
  ],
  exports: [
    ApiKeysService,
    PublicApiKeyGuard,
  ],
})
export class PublicApiModule {}
