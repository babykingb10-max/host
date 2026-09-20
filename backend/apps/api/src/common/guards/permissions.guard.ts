import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import type { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';

export const PERMISSIONS_KEY = 'requiredPermissions';
/**
 * Declares the granular permission(s) required for a route, e.g.
 * @RequirePermissions('projects.restart'). Checked server-side against
 * the DB (never trusting the JWT's role claim alone for sensitive
 * actions) — spec §6: "Never trust frontend authorization."
 */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AccessTokenPayload }>();
    const userId = request.user?.sub;
    if (!userId) throw new AppError(ErrorCode.AUTH_TOKEN_INVALID);

    const grantedKeys = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { rolePermissions: { select: { permission: { select: { key: true } } } } } } },
    });

    const grantedSet = new Set(
      grantedKeys.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
    );

    const hasAll = required.every((perm) => grantedSet.has(perm));
    if (!hasAll) throw new AppError(ErrorCode.FORBIDDEN_INSUFFICIENT_PERMISSIONS);
    return true;
  }
}
