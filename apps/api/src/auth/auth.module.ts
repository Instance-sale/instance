import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NextAuthSessionGuard } from '../common/guards/next-auth-session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, NextAuthSessionGuard],
  exports: [AuthService, NextAuthSessionGuard],
})
export class AuthModule {}
