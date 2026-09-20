import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ListServicesQueryDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  category?: string;
}

/** Admin create/update DTOs arrive in Phase 8 (Admin > Services) alongside the admin controller. */
export class ServicePlanView {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiProperty() cpuMillicores!: number;
  @ApiProperty() ramMb!: number;
  @ApiProperty() storageMb!: number;
  @ApiProperty() price!: { amount: number; currency: string };
  @ApiProperty() isDefault!: boolean;
}
