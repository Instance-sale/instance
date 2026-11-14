import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { InternalSecretGuard } from './internal-secret.guard';

describe('InternalSecretGuard', () => {
  let guard: InternalSecretGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    guard = new InternalSecretGuard();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
    getType: () => 'http',
  } as unknown as ExecutionContext);

  it('throws UnauthorizedException when no server secrets are configured', () => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;

    const context = createMockContext({ 'x-cron-secret': 'some-secret' });
    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Internal secret not configured on server'),
    );
  });

  it('throws UnauthorizedException when request provides no secret header', () => {
    process.env.NEXTAUTH_SECRET = 'valid-test-secret';
    const context = createMockContext({});

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Missing internal authorization secret'),
    );
  });

  it('allows access when valid x-cron-secret header is provided', () => {
    process.env.CRON_SECRET = 'super-secret-cron';
    const context = createMockContext({ 'x-cron-secret': 'super-secret-cron' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when valid x-internal-secret header is provided', () => {
    process.env.NEXTAUTH_SECRET = 'super-secret-internal';
    const context = createMockContext({ 'x-internal-secret': 'super-secret-internal' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when Bearer authorization header matches configured secret', () => {
    process.env.AUTH_SECRET = 'bearer-auth-secret';
    const context = createMockContext({ authorization: 'Bearer bearer-auth-secret' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when provided secret is invalid or has wrong length', () => {
    process.env.NEXTAUTH_SECRET = 'correct-secret';
    const context = createMockContext({ 'x-internal-secret': 'wrong-secret-value' });

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Invalid internal authorization secret'),
    );
  });
});
