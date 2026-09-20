import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { providerFetch } from '../providers/common/provider-http';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_OAUTH_TOKEN = 'https://github.com/login/oauth/access_token';

export interface GithubRepoSummary {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

@Injectable()
export class GithubService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private requireOAuthConfig(): { clientId: string; clientSecret: string } {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'GitHub integration is not configured.');
    return { clientId, clientSecret };
  }

  buildAuthorizeUrl(state: string, redirectUri: string): string {
    const { clientId } = this.requireOAuthConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo read:user',
      state,
    });
    return `${GITHUB_OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  async exchangeCodeAndConnect(userId: string, code: string, redirectUri: string): Promise<void> {
    const { clientId, clientSecret } = this.requireOAuthConfig();

    const tokenRes = await providerFetch(GITHUB_OAUTH_TOKEN, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const tokenBody = (await tokenRes.json()) as { access_token?: string; scope?: string; error?: string };
    if (!tokenBody.access_token) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'GitHub did not return an access token for this authorization code.');
    }

    const userRes = await providerFetch(`${GITHUB_API_BASE}/user`, {
      headers: this.authHeaders(tokenBody.access_token),
    });
    const ghUser = (await userRes.json()) as { id: number; login: string };

    await this.prisma.githubAccount.upsert({
      where: { userId },
      update: {
        githubUserId: ghUser.id,
        githubUsername: ghUser.login,
        accessTokenEncrypted: this.encryption.encrypt(tokenBody.access_token),
        scopes: (tokenBody.scope ?? '').split(',').filter(Boolean),
      },
      create: {
        userId,
        githubUserId: ghUser.id,
        githubUsername: ghUser.login,
        accessTokenEncrypted: this.encryption.encrypt(tokenBody.access_token),
        scopes: (tokenBody.scope ?? '').split(',').filter(Boolean),
      },
    });
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.githubAccount.deleteMany({ where: { userId } });
  }

  async getConnection(userId: string) {
    const account = await this.prisma.githubAccount.findUnique({ where: { userId } });
    if (!account) return null;
    return { githubUsername: account.githubUsername, connectedAt: account.connectedAt, scopes: account.scopes };
  }

  async listRepositories(userId: string): Promise<GithubRepoSummary[]> {
    const token = await this.requireUserToken(userId);
    const res = await providerFetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=50`, {
      headers: this.authHeaders(token),
    });
    const repos = (await res.json()) as {
      id: number; full_name: string; owner: { login: string }; name: string; private: boolean; default_branch: string; updated_at: string;
    }[];
    return repos.map((r) => ({
      id: r.id, fullName: r.full_name, owner: r.owner.login, name: r.name,
      private: r.private, defaultBranch: r.default_branch, updatedAt: r.updated_at,
    }));
  }

  async listBranches(userId: string, owner: string, repo: string): Promise<string[]> {
    const token = await this.requireUserToken(userId);
    const res = await providerFetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`, {
      headers: this.authHeaders(token),
    });
    const branches = (await res.json()) as { name: string }[];
    return branches.map((b) => b.name);
  }

  /** Returns decoded file content, or null if the file doesn't exist (404 is expected/normal here, not an error). */
  async getFileContent(userId: string, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    const token = await this.requireUserToken(userId);
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`, {
      headers: this.authHeaders(token),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new AppError(ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE, 'Could not read the repository right now.');
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (!body.content) return null;
    return Buffer.from(body.content, (body.encoding as BufferEncoding) ?? 'base64').toString('utf8');
  }

  async listRootFiles(userId: string, owner: string, repo: string, ref: string): Promise<string[]> {
    const token = await this.requireUserToken(userId);
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(ref)}`, {
      headers: this.authHeaders(token),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { name: string }[];
    return body.map((f) => f.name);
  }

  private async requireUserToken(userId: string): Promise<string> {
    const account = await this.prisma.githubAccount.findUnique({ where: { userId } });
    if (!account) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Connect your GitHub account first.');
    return this.encryption.decrypt(account.accessTokenEncrypted);
  }

  private authHeaders(token: string) {
    return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  }
}
