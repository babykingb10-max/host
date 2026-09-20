import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('users')
@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.usersService.getProfile(user.sub);
  }
}
