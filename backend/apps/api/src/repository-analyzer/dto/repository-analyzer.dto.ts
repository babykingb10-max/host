import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AnalyzeRepositoryDto {
  @ApiProperty() @IsString()
  owner!: string;

  @ApiProperty() @IsString()
  repo!: string;

  @ApiProperty() @IsString()
  branch!: string;
}

export interface DetectedEnvVar {
  key: string;
  required: boolean;
  defaultValue?: string;
}

export interface AnalysisResult {
  runtime: 'NODE' | 'PYTHON' | 'DOCKER' | 'STATIC' | 'UNKNOWN';
  runtimeVersion?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry';
  framework?: string;
  startCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  port?: number;
  hasDockerfile: boolean;
  environmentVariables: DetectedEnvVar[];
  warnings: string[];
}
