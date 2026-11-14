import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedSecret =
      request.headers['x-cron-secret'] ||
      request.headers['x-internal-secret'] ||
      (request.headers['authorization']?.startsWith('Bearer ')
        ? request.headers['authorization'].slice(7).trim()
        : null);

    const validSecrets = [
      process.env.CRON_SECRET,
      process.env.NEXTAUTH_SECRET,
      process.env.AUTH_SECRET,
    ].filter(Boolean) as string[];

    if (validSecrets.length === 0) {
      throw new UnauthorizedException('Internal secret not configured on server');
    }

    if (!providedSecret) {
      throw new UnauthorizedException('Missing internal authorization secret');
    }

    try {
      const providedBuffer = Buffer.from(String(providedSecret));
      const isMatch = validSecrets.some((secret) => {
        const expectedBuffer = Buffer.from(String(secret));
        return (
          providedBuffer.length === expectedBuffer.length &&
          crypto.timingSafeEqual(providedBuffer, expectedBuffer)
        );
      });

      if (!isMatch) {
        throw new UnauthorizedException('Invalid internal authorization secret');
      }

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid internal authorization secret');
    }
  }
}
