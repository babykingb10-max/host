import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DomainsService } from './domains.service';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';
import { AddDomainDto } from './dto/domains.dto';

@ApiTags('domains')
@Controller()
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get('v1/domains')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.domainsService.listMine(user.sub);
  }

  @Post('v1/projects/:projectId/domains')
  add(@CurrentUser() user: AccessTokenPayload, @Param('projectId') projectId: string, @Body() dto: AddDomainDto) {
    return this.domainsService.add(user.sub, projectId, dto.domainName);
  }

  @Post('v1/domains/:id/verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.domainsService.verify(user.sub, id);
  }

  @Delete('v1/domains/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<void> {
    await this.domainsService.remove(user.sub, id);
  }
}
