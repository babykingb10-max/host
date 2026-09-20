import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength, NotEquals } from 'class-validator';

export class AdjustCreditsDto {
  @ApiProperty() @IsInt() @NotEquals(0)
  amount!: number;

  @ApiProperty() @IsString() @MinLength(3)
  reason!: string;
}
