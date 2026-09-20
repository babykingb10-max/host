import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateEnvVarDto {
  @ApiProperty() @IsString() @MaxLength(128)
  @Matches(/^[A-Z0-9_]+$/, { message: 'key must be UPPER_SNAKE_CASE' })
  key!: string;

  @ApiProperty() @IsString() @MaxLength(8192)
  value!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional() @IsBoolean()
  isSecret?: boolean;
}

export class UpdateEnvVarDto {
  @ApiProperty() @IsString() @MaxLength(8192)
  value!: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isSecret?: boolean;
}

export class BulkImportEnvDto {
  @ApiProperty({ description: 'Raw .env file contents (KEY=VALUE per line)' })
  @IsString()
  content!: string;
}
