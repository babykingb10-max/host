import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WordPressService } from './wordpress.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { InstallWordPressDto } from './dto/wordpress.dto';

@ApiTags('wordpress')
@Controller('v1/wordpress')
export class WordPressController {
  constructor(private readonly wordpressService: WordPressService) {}

  @Post('install')
  install(@CurrentUser() user: AccessTokenPayload, @Body() dto: InstallWordPressDto) {
    return this.wordpressService.install(user.sub, dto);
  }
}
