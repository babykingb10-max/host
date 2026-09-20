import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from './storage.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB per file — configurable ceiling, not a hardcoded business limit

@ApiTags('storage')
@Controller('v1/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('usage')
  getUsage(@CurrentUser() user: AccessTokenPayload) {
    return this.storageService.getUsage(user.sub);
  }

  @Get('buckets')
  listBuckets(@CurrentUser() user: AccessTokenPayload) {
    return this.storageService.listBuckets(user.sub);
  }

  @Post('buckets')
  createBucket(@CurrentUser() user: AccessTokenPayload, @Body('name') name: string) {
    return this.storageService.createBucket(user.sub, name);
  }

  @Delete('buckets/:bucketId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBucket(@CurrentUser() user: AccessTokenPayload, @Param('bucketId') bucketId: string): Promise<void> {
    await this.storageService.deleteBucket(user.sub, bucketId);
  }

  @Get('buckets/:bucketId/files')
  listFiles(@CurrentUser() user: AccessTokenPayload, @Param('bucketId') bucketId: string, @Query('prefix') prefix?: string) {
    return this.storageService.listFiles(user.sub, bucketId, prefix);
  }

  @ApiConsumes('multipart/form-data')
  @Post('buckets/:bucketId/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @CurrentUser() user: AccessTokenPayload,
    @Param('bucketId') bucketId: string,
    @Body('key') key: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new AppError(ErrorCode.VALIDATION_FAILED, 'No file was uploaded.');
    return this.storageService.upload(user.sub, bucketId, key || file.originalname, file.buffer, file.mimetype);
  }

  @Get('buckets/:bucketId/files/:key/download')
  async download(
    @CurrentUser() user: AccessTokenPayload,
    @Param('bucketId') bucketId: string,
    @Param('key') key: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.storageService.download(user.sub, bucketId, decodeURIComponent(key));
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  }

  @Delete('buckets/:bucketId/files/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(@CurrentUser() user: AccessTokenPayload, @Param('bucketId') bucketId: string, @Param('key') key: string): Promise<void> {
    await this.storageService.deleteFile(user.sub, bucketId, decodeURIComponent(key));
  }
}
