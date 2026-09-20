import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Standard 5-field cron: minute hour day-of-month month day-of-week
const CRON_FIELD = '(\\*|[0-9]+(-[0-9]+)?(/[0-9]+)?)(,(\\*|[0-9]+(-[0-9]+)?(/[0-9]+)?))*';
const CRON_REGEX = new RegExp(`^${CRON_FIELD}\\s+${CRON_FIELD}\\s+${CRON_FIELD}\\s+${CRON_FIELD}\\s+${CRON_FIELD}$`);

export function isValidCronExpression(expr: string): boolean {
  return CRON_REGEX.test(expr.trim());
}

export class CreateCronJobDto {
  @ApiProperty() @IsString()
  projectId!: string;

  @ApiProperty({ description: 'Standard 5-field cron expression, e.g. "*/15 * * * *"' })
  @IsString()
  schedule!: string;
}

export class UpdateCronJobDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  schedule?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  enabled?: boolean;
}
