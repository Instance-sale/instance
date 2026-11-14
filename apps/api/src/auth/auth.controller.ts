import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CheckEmailDto } from './dto/check-email.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NextAuthSessionGuard } from '../common/guards/next-auth-session.guard';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

@Controller('auth')
@UseGuards(NextAuthSessionGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('sync-user')
  async syncUser(@Body() dto: SyncUserDto) {
    return this.authService.syncUser(dto);
  }

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user);
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('check-email')
  async checkEmail(@Body() dto: CheckEmailDto) {
    return this.authService.checkEmail(dto.email);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('adapter/create-user')
  async adapterCreateUser(@Body() body: any) {
    return this.authService.adapterCreateUser(body);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Get('adapter/user/:id')
  async adapterGetUser(@Param('id') id: string) {
    return this.authService.adapterGetUser(id);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Get('adapter/user-by-email')
  async adapterGetUserByEmail(@Query('email') email: string) {
    return this.authService.adapterGetUserByEmail(email);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Get('adapter/user-by-account')
  async adapterGetUserByAccount(
    @Query('provider') provider: string,
    @Query('providerAccountId') providerAccountId: string,
  ) {
    return this.authService.adapterGetUserByAccount(provider, providerAccountId);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('adapter/update-user')
  async adapterUpdateUser(@Body() body: any) {
    return this.authService.adapterUpdateUser(body);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('adapter/link-account')
  async adapterLinkAccount(@Body() body: any) {
    return this.authService.adapterLinkAccount(body);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('adapter/create-verification-token')
  async adapterCreateVerificationToken(@Body() body: any) {
    return this.authService.adapterCreateVerificationToken(body);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('adapter/use-verification-token')
  async adapterUseVerificationToken(@Body() body: { identifier: string; token: string }) {
    return this.authService.adapterUseVerificationToken(body.identifier, body.token);
  }

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('send-verification-email')
  async sendVerificationEmail(@Body() body: { identifier: string; url: string }) {
    return this.authService.sendVerificationEmail(body.identifier, body.url);
  }
}

