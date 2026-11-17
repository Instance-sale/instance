import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SyncUserDto } from './dto/sync-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) { }

  async syncUser(dto: SyncUserDto) {
    const email = dto.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        ownedCompanies: true,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name || null,
          image: dto.image || null,
          role: 'OWNER',
          companyId: null,
          emailVerified: new Date(),
        },
        include: {
          company: true,
          ownedCompanies: true,
        },
      });

      this.logger.log(`Created new synced user: ${user.email} (role: ${user.role})`);
    } else {
      // Update name/image if missing or changed
      const updates: any = {};
      if (!user.name && dto.name) updates.name = dto.name;
      if (!user.image && dto.image) updates.image = dto.image;

      if (Object.keys(updates).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updates,
          include: {
            company: true,
            ownedCompanies: true,
          },
        });
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      companyId: user.companyId,
      company: user.company,
      ownedCompanies: user.ownedCompanies || [],
    };
  }

  async checkEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    return { exists: !!user };
  }

  async getMe(currentUser: any) {
    if (!currentUser) return null;
    return {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      image: currentUser.image,
      companyId: currentUser.companyId,
      company: currentUser.company,
      ownedCompanies: currentUser.ownedCompanies || [],
    };
  }

  async adapterCreateUser(data: any) {
    const email = data.email.toLowerCase().trim();
    const totalUsers = await this.prisma.user.count();
    const isFirstUser = totalUsers === 0;

    return this.prisma.user.create({
      data: {
        email,
        name: data.name || null,
        image: data.image || null,
        emailVerified: data.emailVerified ? new Date(data.emailVerified) : null,
        role: 'OWNER',
      },
    });
  }

  async adapterGetUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async adapterGetUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async adapterGetUserByAccount(provider: string, providerAccountId: string) {
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: { user: true },
    });
    return account?.user || null;
  }

  async adapterUpdateUser(data: any) {
    const { id, ...rest } = data;
    if (rest.email) rest.email = rest.email.toLowerCase().trim();
    if (rest.emailVerified) rest.emailVerified = new Date(rest.emailVerified);
    return this.prisma.user.update({
      where: { id },
      data: rest,
    });
  }

  async adapterLinkAccount(data: any) {
    return this.prisma.account.create({
      data: {
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        expires_at: data.expires_at,
        token_type: data.token_type,
        scope: data.scope,
        id_token: data.id_token,
        session_state: data.session_state,
      },
    });
  }

  async adapterCreateVerificationToken(data: any) {
    return this.prisma.verificationToken.create({
      data: {
        identifier: data.identifier,
        token: data.token,
        expires: new Date(data.expires),
      },
    });
  }

  async adapterUseVerificationToken(identifier: string, token: string) {
    try {
      return await this.prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier,
            token,
          },
        },
      });
    } catch {
      return null;
    }
  }

  async sendVerificationEmail(to: string, url: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`\n=======================================================\n[DEV MAGIC LINK] To: ${to}\n🔗 Sign-in URL: ${url}\n=======================================================\n`);
    }
    try {
      const isSecure = process.env.EMAIL_SERVER_PORT === '465';
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
        secure: isSecure,
        family: 4,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        connectionTimeout: 15000,
      } as any);

      const from =
        process.env.EMAIL_FROM ||
        process.env.EMAIL_SERVER_USER ||
        'noreply@xyz.com';

      await transporter.sendMail({
        from,
        to,
        subject: 'Sign in to Instance',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to Instance</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center;">
              <div style="display: inline-block; padding: 10px 18px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; font-weight: 700; font-size: 20px; letter-spacing: -0.5px;">
                Instance
              </div>
              <h1 style="margin: 24px 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">
                Sign in to your account
              </h1>
              <p style="margin: 0; font-size: 15px; line-height: 24px; color: #64748b;">
                Click the button below to securely sign in to Instance. This magic link is valid for 24 hours.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 28px 36px; text-align: center;">
              <a href="${url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                Sign in to Instance
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 36px 28px 36px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8; text-align: center;">
                Or copy and paste this URL into your browser:
              </p>
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 10px 14px; word-break: break-all; font-size: 12px; color: #3b82f6; text-align: center;">
                <a href="${url}" style="color: #2563eb; text-decoration: none;">${url}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 36px 28px 36px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                If you did not request this email, you can safely ignore it. Your account remains completely secure.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
      });
      return { success: true };
    } catch (err: any) {
      this.logger.error('Failed to send verification email', err);
      this.logger.warn(`\n=======================================================\n[FALLBACK SIGN-IN URL] To: ${to}\n🔗 Sign-in URL: ${url}\n=======================================================\n`);
      return { success: false, error: err.message };
    }
  }
}
