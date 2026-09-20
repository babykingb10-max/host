import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { Public } from '../common/guards/jwt-auth.guard';
import { ListServicesQueryDto } from './dto/services.dto';

@ApiTags('services')
@Controller('v1/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  list(@Query() query: ListServicesQueryDto) {
    return this.servicesService.listEnabled(query.category);
  }

  @Public()
  @Get(':slug')
  getOne(@Param('slug') slug: string) {
    return this.servicesService.getBySlug(slug);
  }
}
