import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
      secure: process.env.EMAIL_SERVER_PORT === '465',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }

  async sendContactForm(dto: ContactDto): Promise<{ success: boolean }> {
    try {
      const from =
        process.env.EMAIL_FROM ||
        process.env.EMAIL_SERVER_USER ||
        'noreply@xyz';
      const to =
        process.env.CONTACT_EMAIL ||
        process.env.EMAIL_SERVER_USER ||
        'noreply@xyz';

      const subjectMap = {
        help: `[Instance Help] ${dto.subject || 'Support request'}`,
        'feature-request': `[Instance Feature Request] ${dto.subject || 'New request'}`,
        feedback: `[Instance Feedback] ${dto.subject || 'New feedback'}`,
      };
      const subject = subjectMap[dto.type];

      const html = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1A1A1A; margin-top: 0;">${subject}</h2>
              <p><strong>From:</strong> ${dto.name} &lt;${dto.email}&gt;</p>
              ${dto.subject ? `<p><strong>Subject:</strong> ${dto.subject}</p>` : ''}
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
              <p style="white-space: pre-wrap;">${(dto.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          </body>
        </html>
      `;

      await this.transporter.sendMail({ from, to, subject, html });
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to send message. Please try again.',
      );
    }
  }
}
