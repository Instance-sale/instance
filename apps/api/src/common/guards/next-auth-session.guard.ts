import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { decode } from 'next-auth/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class NextAuthSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentication required: Missing session token');
    }

    try {
      let authenticatedUser: any = null;
      const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

      // 1. Attempt to decode as NextAuth JWT token
      if (secret) {
        try {
          const decoded = await decode({ token, secret });
          if (decoded && (decoded.id || decoded.sub || decoded.email)) {
            const user = await this.prisma.user.findFirst({
              where: {
                OR: [
                  decoded.id ? { id: decoded.id as string } : null,
                  decoded.sub ? { id: decoded.sub as string } : null,
                  decoded.email ? { email: decoded.email as string } : null,
                ].filter(Boolean) as any,
              },
              include: {
                company: true,
                ownedCompanies: true,
              },
            });
            if (user) {
              authenticatedUser = user;
            }
          }
        } catch {
          // Token is not a valid NextAuth JWT, proceed to database session lookup
        }
      }

      // 2. Fallback: Lookup in database Session table
      if (!authenticatedUser) {
        const session = await this.prisma.session.findUnique({
          where: { sessionToken: token },
          include: {
            user: {
              include: {
                company: true,
                ownedCompanies: true,
              },
            },
          },
        });

        if (session && new Date(session.expires) >= new Date()) {
          authenticatedUser = session.user;
        }
      }

      if (!authenticatedUser) {
        if (isPublic) return true;
        throw new UnauthorizedException('Session expired or invalid');
      }

      request.user = authenticatedUser;
      return true;
    } catch (error) {
      if (isPublic) return true;
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Failed to authenticate session');
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    // 1. Check cookies (standard NextAuth cookie names for HTTP & HTTPS)
    const cookies = request.cookies || {};
    const cookieToken =
      cookies['next-auth.session-token'] ||
      cookies['__Secure-next-auth.session-token'];
    if (cookieToken) return cookieToken;

    // 2. Check Authorization header: Bearer <token>
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    // 3. Fallback: Check custom x-session-token header
    const customHeader = request.headers['x-session-token'];
    if (typeof customHeader === 'string' && customHeader) {
      return customHeader;
    }

    // 4. Fallback: Check query param (e.g. for EventSource / SSE connections)
    const queryToken = request.query?.token || request.query?.sessionToken;
    if (typeof queryToken === 'string' && queryToken) {
      return queryToken;
    }

    return null;
  }
}
