import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class AddDomainDto {
  @ApiProperty()
  @IsString()
  @Matches(/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i, { message: 'Enter a valid domain name (e.g. example.com)' })
  domainName!: string;
}
