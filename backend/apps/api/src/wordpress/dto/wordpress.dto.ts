import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class InstallWordPressDto {
  @ApiProperty() @IsString() @MinLength(2)
  siteName!: string;

  @ApiProperty() @IsString()
  domain!: string;

  @ApiProperty() @IsString() @MinLength(3)
  adminUsername!: string;

  @ApiProperty() @IsString() @MinLength(8)
  adminPassword!: string;

  @ApiProperty() @IsEmail()
  adminEmail!: string;
}
