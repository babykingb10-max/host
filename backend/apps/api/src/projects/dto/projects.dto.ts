import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60)
  name!: string;

  @ApiProperty() @IsUUID()
  serviceId!: string;

  @ApiProperty() @IsUUID()
  servicePlanId!: string;
}

export class ListProjectsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString()
  status?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  serviceSlug?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 }) @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 }) @IsOptional()
  pageSize?: number;
}

export class RenameProjectDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(60)
  name!: string;
}
