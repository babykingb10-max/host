import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { CreateEnvVarDto, UpdateEnvVarDto } from './dto/environment.dto';

const MASK = '••••••••';

@Injectable()
export class EnvironmentVariablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async list(ownerId: string, projectId: string) {
    await this.requireOwnedProject(ownerId, projectId);
    const vars = await this.prisma.projectEnvironmentVariable.findMany({
      where: { projectId },
      orderBy: { key: 'asc' },
    });
    return vars.map((v) => ({
      id: v.id,
      key: v.key,
      isSecret: v.isSecret,
      // Non-secret values are shown in full; secrets are masked by
      // default and only decrypted via reveal() (spec §35).
      value: v.isSecret ? MASK : this.encryption.decrypt(v.valueEncrypted),
      updatedAt: v.updatedAt,
    }));
  }

  async reveal(ownerId: string, projectId: string, varId: string): Promise<{ value: string }> {
    await this.requireOwnedProject(ownerId, projectId);
    const v = await this.prisma.projectEnvironmentVariable.findUnique({ where: { id: varId } });
    if (!v || v.projectId !== projectId) throw new AppError(ErrorCode.NOT_FOUND);
    return { value: this.encryption.decrypt(v.valueEncrypted) };
  }

  async create(ownerId: string, projectId: string, dto: CreateEnvVarDto) {
    await this.requireOwnedProject(ownerId, projectId);
    const existing = await this.prisma.projectEnvironmentVariable.findUnique({
      where: { projectId_key: { projectId, key: dto.key } },
    });
    if (existing) throw new AppError(ErrorCode.VALIDATION_FAILED, `A variable named ${dto.key} already exists.`);

    const created = await this.prisma.projectEnvironmentVariable.create({
      data: { projectId, key: dto.key, valueEncrypted: this.encryption.encrypt(dto.value), isSecret: dto.isSecret ?? false },
    });
    return { id: created.id, key: created.key, isSecret: created.isSecret };
  }

  async update(ownerId: string, projectId: string, varId: string, dto: UpdateEnvVarDto) {
    await this.requireOwnedProject(ownerId, projectId);
    const v = await this.prisma.projectEnvironmentVariable.findUnique({ where: { id: varId } });
    if (!v || v.projectId !== projectId) throw new AppError(ErrorCode.NOT_FOUND);

    const updated = await this.prisma.projectEnvironmentVariable.update({
      where: { id: varId },
      data: { valueEncrypted: this.encryption.encrypt(dto.value), ...(dto.isSecret !== undefined ? { isSecret: dto.isSecret } : {}) },
    });
    return { id: updated.id, key: updated.key, isSecret: updated.isSecret };
  }

  async remove(ownerId: string, projectId: string, varId: string): Promise<void> {
    await this.requireOwnedProject(ownerId, projectId);
    const v = await this.prisma.projectEnvironmentVariable.findUnique({ where: { id: varId } });
    if (!v || v.projectId !== projectId) throw new AppError(ErrorCode.NOT_FOUND);
    await this.prisma.projectEnvironmentVariable.delete({ where: { id: varId } });
  }

  async bulkImport(ownerId: string, projectId: string, content: string): Promise<{ imported: number; skipped: number }> {
    await this.requireOwnedProject(ownerId, projectId);
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='));

    let imported = 0;
    let skipped = 0;
    for (const line of lines) {
      const [rawKey, ...rest] = line.split('=');
      const key = rawKey.trim();
      const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (!/^[A-Z0-9_]+$/.test(key)) {
        skipped += 1;
        continue;
      }
      await this.prisma.projectEnvironmentVariable.upsert({
        where: { projectId_key: { projectId, key } },
        update: { valueEncrypted: this.encryption.encrypt(value) },
        create: { projectId, key, valueEncrypted: this.encryption.encrypt(value), isSecret: false },
      });
      imported += 1;
    }
    return { imported, skipped };
  }

  private async requireOwnedProject(ownerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.deletedAt || project.ownerId !== ownerId) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
    return project;
  }
}
