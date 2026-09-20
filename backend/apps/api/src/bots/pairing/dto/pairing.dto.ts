import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RequestPairingDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  phoneNumber?: string;
}

export class SubmitManualSessionDto {
  @ApiProperty() @IsString() @MinLength(4)
  sessionId!: string;
}

export class PairingCallbackDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString()
  pairingCode?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  qrCodeData?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  sessionData?: string;

  @ApiProperty({ required: false }) @IsOptional()
  connected?: boolean;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  errorMessage?: string;
}
