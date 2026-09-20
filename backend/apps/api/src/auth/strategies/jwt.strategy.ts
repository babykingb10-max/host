import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AccessTokenPayload {
  sub: string; // userId
  sessionId: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.query?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AccessTokenPayload> {
    // Kept intentionally thin: full user/session/suspension checks live in
    // CurrentUserInterceptor-equivalent guards for endpoints that need
    // fresh state (e.g. suspension can't wait for token expiry). Basic
    // guards trust the signed payload for latency-sensitive routes.
    return payload;
  }
}
