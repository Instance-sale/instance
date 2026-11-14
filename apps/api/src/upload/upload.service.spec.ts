import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service';

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = vi.fn().mockResolvedValue({});
    },
    PutObjectCommand: class {
      constructor(public args: any) {}
    },
    DeleteObjectCommand: class {
      constructor(public args: any) {}
    },
  };
});

describe('UploadService', () => {
  let service: UploadService;
  let prisma: PrismaService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: 'test-account',
      R2_ACCESS_KEY_ID: 'test-key',
      R2_SECRET_ACCESS_KEY: 'test-secret',
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://cdn.example.com',
    };

    prisma = {
      user: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new UploadService(prisma);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws BadRequestException if no file is provided', async () => {
    await expect(service.uploadFile(null as any, 'media')).rejects.toThrow(
      new BadRequestException('No file provided'),
    );
  });

  it('throws BadRequestException for invalid folder', async () => {
    const fakeFile: any = { size: 100, originalname: 'test.png', mimetype: 'image/png' };
    await expect(service.uploadFile(fakeFile, 'invalid-folder')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException if file size exceeds 50MB', async () => {
    const hugeFile: any = {
      size: 51 * 1024 * 1024,
      originalname: 'large.mp4',
      mimetype: 'video/mp4',
    };
    await expect(service.uploadFile(hugeFile, 'media')).rejects.toThrow(
      new BadRequestException('File size exceeds 50MB limit'),
    );
  });

  it('throws BadRequestException for unsupported file extension', async () => {
    const badExtFile: any = {
      size: 1024,
      originalname: 'dangerous.exe',
      mimetype: 'application/x-msdownload',
    };
    await expect(service.uploadFile(badExtFile, 'media')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('uploads file successfully to R2 and formats CDN url', async () => {
    const validFile: any = {
      size: 2048,
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes'),
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'u1',
      company: { name: 'Acme Studio' },
    } as any);

    const result = await service.uploadFile(validFile, 'company-assets', undefined, 'u1');

    expect(result.url).toContain('https://cdn.example.com/company-assets/acme-studio/');
    expect(result.folder).toBe('company-assets');
  });
});
