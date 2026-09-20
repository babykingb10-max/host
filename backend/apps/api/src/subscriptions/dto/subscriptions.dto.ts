import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ enum: ['FREE', 'STARTER', 'PRO', 'BUSINESS'] })
  @IsIn(['FREE', 'STARTER', 'PRO', 'BUSINESS'])
  tier!: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
}
