import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PasswordHasherService } from './password-hasher.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailerService } from '../common/utils/mailer.service';
import { CreditsModule } from '../credits/credits.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), CreditsModule, SecurityModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, PasswordHasherService, JwtStrategy, MailerService],
  exports: [AuthService],
})
export class AuthModule {}
