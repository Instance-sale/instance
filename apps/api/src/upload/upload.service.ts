import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_FOLDERS = [
  'company-assets',
  'testimonials',
  'media',
  'documents',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'mp4',
  'webm',
  'pdf',
  'csv',
  'txt',
]);

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'audio/',
  'video/',
  'application/pdf',
  'text/csv',
  'text/plain',
];

function sanitizeSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly r2Bucket: string;
  private readonly r2PublicUrl: string;

  constructor(private readonly prisma: PrismaService) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.r2Bucket = process.env.R2_BUCKET_NAME || 'instance-media';
    this.r2PublicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`Initialized Cloudflare R2 storage provider (bucket: ${this.r2Bucket})`);
    } else {
      this.logger.warn(
        'Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are not set in environment.',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    companyName?: string,
    userId?: string,
  ): Promise<{ url: string; path: string; folder: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      throw new BadRequestException(
        `Invalid folder. Must be one of: ${ALLOWED_FOLDERS.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    const rawExt = (file.originalname || '').split('.').pop()?.toLowerCase() || '';
    if (!rawExt || !ALLOWED_EXTENSIONS.has(rawExt)) {
      throw new BadRequestException(
        `Unsupported file extension: .${rawExt}. Allowed extensions are: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
      );
    }

    const mime = (file.mimetype || '').toLowerCase();
    const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
    if (!isMimeAllowed) {
      throw new BadRequestException(`Unsupported MIME type: ${mime}`);
    }

    if (!this.s3Client) {
      throw new InternalServerErrorException(
        'Cloudflare R2 storage is not configured. Please supply R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env.',
      );
    }

    let userCompany: { name: string } | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { company: true },
      });
      userCompany = user?.company || null;
    }

    const companySegment = userCompany
      ? sanitizeSegment(userCompany.name)
      : companyName && companyName.trim()
        ? sanitizeSegment(companyName)
        : `user-${userId || 'anonymous'}`;

    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${rawExt}`;
    const destinationPath = `${folder}/${companySegment}/${cleanFileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.r2Bucket,
        Key: destinationPath,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      }),
    );

    const url = this.r2PublicUrl
      ? `${this.r2PublicUrl}/${destinationPath}`
      : destinationPath;

    return {
      url,
      path: destinationPath,
      folder,
    };
  }

  async deleteFile(url: string | string[]): Promise<void> {
    if (!this.s3Client) {
      this.logger.warn('Cloudflare R2 client not initialized; skipping file deletion');
      return;
    }

    const urls = Array.isArray(url) ? url : [url];

    for (const u of urls) {
      const key = this.r2PublicUrl && u.startsWith(this.r2PublicUrl)
        ? u.slice(this.r2PublicUrl.length).replace(/^\//, '')
        : u.replace(/^https?:\/\/[^\/]+\//, '');

      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.r2Bucket,
            Key: key,
          }),
        );
      } catch (err: any) {
        this.logger.error(`Failed to delete object from R2 (key: ${key}): ${err.message}`);
      }
    }
  }
}
