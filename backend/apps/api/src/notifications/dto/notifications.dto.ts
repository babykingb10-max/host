import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() deploymentEvents?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() billingEvents?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() securityEvents?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() promotionalEvents?: boolean;
}

export class RegisterDeviceTokenDto {
  @ApiProperty() @IsString()
  token!: string;

  @ApiProperty({ enum: ['web', 'ios', 'android'] })
  @IsIn(['web', 'ios', 'android'])
  platform!: string;
}
