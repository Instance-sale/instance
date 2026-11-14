import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { DebugService } from './debug.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('debug')
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  @Public()
  @Get('magic-link')
  async getMagicLink(@Query('email') email: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Not found');
    }
    return this.debugService.getLatestMagicLink(email);
  }
}
