import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { RegisterDeviceTokenDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';

@ApiTags('notifications')
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.list(user.sub, unreadOnly === 'true');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AccessTokenPayload) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: AccessTokenPayload) {
    return this.notificationsService.getPreferences(user.sub);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(user.sub, dto);
  }

  @Post('device-tokens')
  @HttpCode(HttpStatus.OK)
  async registerDeviceToken(@CurrentUser() user: AccessTokenPayload, @Body() dto: RegisterDeviceTokenDto) {
    await this.notificationsService.registerDeviceToken(user.sub, dto.token, dto.platform);
    return { message: 'Device registered.' };
  }

  @Delete('device-tokens/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregisterDeviceToken(@CurrentUser() user: AccessTokenPayload, @Param('token') token: string): Promise<void> {
    await this.notificationsService.unregisterDeviceToken(user.sub, token);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    await this.notificationsService.markRead(user.sub, id);
    return { message: 'Marked as read.' };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AccessTokenPayload) {
    await this.notificationsService.markAllRead(user.sub);
    return { message: 'All notifications marked as read.' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<void> {
    await this.notificationsService.remove(user.sub, id);
  }
}
