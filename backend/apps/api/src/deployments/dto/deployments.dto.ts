import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class TriggerDeploymentDto {
  // Source/environment overrides for this specific deploy — the full
  // wizard payload (source selection, env vars) lands with the
  // Deployment Wizard frontend in Phase 5; this DTO already accepts it
  // so the wizard doesn't need backend changes when it ships.
  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  source?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  environment?: Record<string, string>;
}
