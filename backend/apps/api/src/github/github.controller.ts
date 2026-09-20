import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GithubService } from './github.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { Public } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/guards/current-user.decorator';
import type { AccessTokenPayload } from '../auth/strategies/jwt.strategy';

const STATE_TTL_MS = 10 * 60 * 1000;

@ApiTags('github')
@Controller('v1/github')
export class GithubController {
  constructor(
    private readonly github: GithubService,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  private redirectUri(): string {
    return `${this.config.get<string>('API_URL')}/api/v1/github/oauth/callback`;
  }

  @Get('connection')
  getConnection(@CurrentUser() user: AccessTokenPayload) {
    return this.github.getConnection(user.sub);
  }

  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    await this.github.disconnect(user.sub);
  }

  @Get('oauth/url')
  getAuthorizeUrl(@CurrentUser() user: AccessTokenPayload) {
    const state = this.encryption.encrypt(JSON.stringify({ userId: user.sub, exp: Date.now() + STATE_TTL_MS }));
    return { url: this.github.buildAuthorizeUrl(state, this.redirectUri()) };
  }

  /**
   * Public because the browser redirect here doesn't carry an
   * Authorization header — the encrypted `state` param (tamper-proof
   * via AES-GCM auth tag) is what proves which user initiated this and
   * that it hasn't expired, standing in for a server session.
   */
  @Public()
  @Get('oauth/callback')
  async oauthCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const appUrl = this.config.get<string>('APP_URL');
    try {
      const decoded = JSON.parse(this.encryption.decrypt(state)) as { userId: string; exp: number };
      if (Date.now() > decoded.exp) {
        return res.redirect(`${appUrl}/account/settings?github=expired`);
      }
      await this.github.exchangeCodeAndConnect(decoded.userId, code, this.redirectUri());
      return res.redirect(`${appUrl}/account/settings?github=connected`);
    } catch {
      return res.redirect(`${appUrl}/account/settings?github=error`);
    }
  }

  @Get('repositories')
  listRepositories(@CurrentUser() user: AccessTokenPayload) {
    return this.github.listRepositories(user.sub);
  }

  @Get('repositories/:owner/:repo/branches')
  listBranches(@CurrentUser() user: AccessTokenPayload, @Param('owner') owner: string, @Param('repo') repo: string) {
    return this.github.listBranches(user.sub, owner, repo);
  }
}
