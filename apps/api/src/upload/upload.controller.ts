import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @Body('companyName') companyName: string,
    @CurrentUser() user: any,
  ) {
    return this.uploadService.uploadFile(
      file,
      folder,
      companyName,
      user?.id,
    );
  }
}
