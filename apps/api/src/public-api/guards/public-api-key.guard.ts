import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../services/api-keys.service';

@Injectable()
export class PublicApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    let rawKey = request.headers['x-api-key'];

    if (!rawKey && request.headers['authorization']) {
      const authHeader = request.headers['authorization'] as string;
      if (authHeader.startsWith('Bearer ')) {
        rawKey = authHeader.substring(7).trim();
      }
    }

    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException({
        status: 'error',
        message: 'Missing API key. Provide via X-API-Key header or Authorization: Bearer <key>',
        code: 401,
      });
    }

    const keyContext = await this.apiKeysService.validateKey(rawKey.trim());
    request.apiKey = keyContext;
    request.companyId = keyContext.companyId;

    return true;
  }
}
