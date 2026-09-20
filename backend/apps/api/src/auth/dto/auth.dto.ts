import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80)
  displayName!: string;

  @ApiProperty() @IsString() @MinLength(3) @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers and underscores' })
  username!: string;

  @ApiProperty() @IsEmail()
  email!: string;

  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain upper, lower case letters and a number',
  })
  password!: string;

  @ApiProperty({ required: false }) @IsString() @IsOptional()
  referralCode?: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Email or username' }) @IsString()
  identifier!: string;

  @ApiProperty() @IsString()
  password!: string;
}

export class RefreshDto {
  @ApiProperty() @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString()
  token!: string;

  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain upper, lower case letters and a number',
  })
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty() @IsString()
  token!: string;
}
