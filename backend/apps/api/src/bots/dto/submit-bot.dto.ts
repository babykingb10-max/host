import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitBotDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @ApiProperty() @IsString() @MinLength(10)
  description!: string;

  @ApiProperty() @IsString()
  repository!: string;

  @ApiProperty() @IsString()
  branch!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  demoUrl?: string;

  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray()
  screenshots?: string[];

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  documentationUrl?: string;

  @ApiProperty() @IsIn(['NODE', 'PYTHON', 'DOCKER'])
  runtime!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  startCommand?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  packageManager?: string;

  @ApiProperty({ enum: ['PAIRING_CODE_SESSION_API', 'PAIRING_CODE_SESSION_WHATSAPP', 'QR_CODE', 'EXTERNAL_PAIRING', 'MANUAL_SESSION', 'NO_PAIRING'] })
  @IsIn(['PAIRING_CODE_SESSION_API', 'PAIRING_CODE_SESSION_WHATSAPP', 'QR_CODE', 'EXTERNAL_PAIRING', 'MANUAL_SESSION', 'NO_PAIRING'])
  pairingMode!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  pairingServiceUrl?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsArray()
  environmentVariables?: { key: string; required: boolean; defaultValue?: string }[];

  @ApiProperty({ required: false }) @IsOptional() @IsObject()
  resourceRequirements?: { cpuMillicores?: number; ramMb?: number; storageMb?: number };

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  ownershipNotes?: string;

  @ApiProperty() @IsEmail()
  contactEmail!: string;
}
