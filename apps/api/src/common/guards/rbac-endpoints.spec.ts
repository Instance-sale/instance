import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RBAC Endpoints Guard Matrix', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const createMockContext = (user?: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
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

  const testMatrix = [
    { required: ['ADMIN'], role: 'ADMIN', allowed: true },
    { required: ['ADMIN'], role: 'USER', allowed: false },
    { required: ['ADMIN', 'SUPERADMIN'], role: 'SUPERADMIN', allowed: true },
    { required: ['MEMBER'], role: 'USER', allowed: false },
    { required: ['MEMBER', 'ADMIN'], role: 'MEMBER', allowed: true },
  ];

  testMatrix.forEach(({ required, role, allowed }) => {
    it(`evaluates required roles [${required.join(', ')}] for role "${role}" as ${allowed ? 'ALLOWED' : 'DENIED'}`, () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(required);
      const context = createMockContext({ role });

      if (allowed) {
        expect(guard.canActivate(context)).toBe(true);
      } else {
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      }
    });
  });
});
