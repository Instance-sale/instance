import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { CrmExportService } from './services/crm-export.service';
import { CrmAudienceListService } from './services/crm-audience-list.service';
import { CrmPipelineService } from './services/crm-pipeline.service';

@Module({
  controllers: [CrmController],
  providers: [CrmService, CrmExportService, CrmAudienceListService, CrmPipelineService],
  exports: [CrmService, CrmExportService, CrmAudienceListService, CrmPipelineService],
})
export class CrmModule {}
