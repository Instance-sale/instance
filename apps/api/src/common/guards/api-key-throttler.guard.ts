import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const rawKey = req.headers['x-api-key'];
    if (rawKey && typeof rawKey === 'string') {
      return `api_key:${rawKey.trim().slice(-12)}`;
    }
    const auth = req.headers['authorization'];
    if (auth && typeof auth === 'string' && auth.startsWith('Bearer inst_')) {
      return `api_key:${auth.trim().slice(-12)}`;
    }
    return req.ips?.length ? req.ips[0] : req.ip;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        status: 'error',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Too Many Requests. Rate limit exceeded: ${throttlerLimitDetail.limit} requests per minute.`,
        code: HttpStatus.TOO_MANY_REQUESTS,
        ttl: throttlerLimitDetail.ttl,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
