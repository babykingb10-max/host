import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

function sanitizeKey(key: string): string {
  const normalized = path.posix.normalize(key).replace(/^(\.\.(\/|$))+/, '');
  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid file path.');
  }
  return normalized;
}

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.root = this.config.get<string>('STORAGE_ROOT') ?? path.join(process.cwd(), 'storage-data');
  }

  async listBuckets(ownerId: string) {
    const buckets = await this.prisma.storageBucket.findMany({ where: { ownerId }, include: { _count: { select: { files: true } } } });
    return buckets.map((b) => ({ id: b.id, name: b.name, fileCount: b._count.files, createdAt: b.createdAt }));
  }

  async createBucket(ownerId: string, name: string) {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(name)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Bucket names must be lowercase letters, numbers, and hyphens.');
    }
    const existing = await this.prisma.storageBucket.findUnique({ where: { ownerId_name: { ownerId, name } } });
    if (existing) throw new AppError(ErrorCode.VALIDATION_FAILED, 'A bucket with this name already exists.');

    const bucket = await this.prisma.storageBucket.create({ data: { ownerId, name } });
    await fs.mkdir(this.bucketDir(ownerId, name), { recursive: true });
    return { id: bucket.id, name: bucket.name, createdAt: bucket.createdAt };
  }

  async deleteBucket(ownerId: string, bucketId: string): Promise<void> {
    const bucket = await this.requireOwnedBucket(ownerId, bucketId);
    await this.prisma.storageBucket.delete({ where: { id: bucketId } });
    await fs.rm(this.bucketDir(ownerId, bucket.name), { recursive: true, force: true });
  }

  async listFiles(ownerId: string, bucketId: string, prefix?: string) {
    await this.requireOwnedBucket(ownerId, bucketId);
    const files = await this.prisma.storageFile.findMany({
      where: { bucketId, ...(prefix ? { key: { startsWith: prefix } } : {}) },
      orderBy: { key: 'asc' },
    });
    return files.map((f) => ({ id: f.id, key: f.key, sizeBytes: f.sizeBytes, contentType: f.contentType, createdAt: f.createdAt }));
  }

  async upload(ownerId: string, bucketId: string, key: string, buffer: Buffer, contentType: string) {
    const bucket = await this.requireOwnedBucket(ownerId, bucketId);
    const safeKey = sanitizeKey(key);
    const fullPath = path.join(this.bucketDir(ownerId, bucket.name), safeKey);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const file = await this.prisma.storageFile.upsert({
      where: { bucketId_key: { bucketId, key: safeKey } },
      update: { sizeBytes: buffer.length, contentType },
      create: { bucketId, key: safeKey, sizeBytes: buffer.length, contentType },
    });
    return { id: file.id, key: file.key, sizeBytes: file.sizeBytes, contentType: file.contentType };
  }

  async download(ownerId: string, bucketId: string, key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const bucket = await this.requireOwnedBucket(ownerId, bucketId);
    const safeKey = sanitizeKey(key);
    const file = await this.prisma.storageFile.findUnique({ where: { bucketId_key: { bucketId, key: safeKey } } });
    if (!file) throw new AppError(ErrorCode.NOT_FOUND);

    const fullPath = path.join(this.bucketDir(ownerId, bucket.name), safeKey);
    const buffer = await fs.readFile(fullPath).catch(() => {
      throw new AppError(ErrorCode.NOT_FOUND, 'This file is missing from storage.');
    });
    return { buffer, contentType: file.contentType };
  }

  async deleteFile(ownerId: string, bucketId: string, key: string): Promise<void> {
    const bucket = await this.requireOwnedBucket(ownerId, bucketId);
    const safeKey = sanitizeKey(key);
    await this.prisma.storageFile.delete({ where: { bucketId_key: { bucketId, key: safeKey } } }).catch(() => undefined);
    await fs.rm(path.join(this.bucketDir(ownerId, bucket.name), safeKey), { force: true });
  }

  async getUsage(ownerId: string): Promise<{ totalBytes: number; fileCount: number }> {
    const result = await this.prisma.storageFile.aggregate({
      where: { bucket: { ownerId } },
      _sum: { sizeBytes: true },
      _count: { id: true },
    });
    return { totalBytes: result._sum.sizeBytes ?? 0, fileCount: result._count.id };
  }

  private bucketDir(ownerId: string, bucketName: string): string {
    return path.join(this.root, ownerId, bucketName);
  }

  private async requireOwnedBucket(ownerId: string, bucketId: string) {
    const bucket = await this.prisma.storageBucket.findUnique({ where: { id: bucketId } });
    if (!bucket || bucket.ownerId !== ownerId) throw new AppError(ErrorCode.NOT_FOUND);
    return bucket;
  }
}
