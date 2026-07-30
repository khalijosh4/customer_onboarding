import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import {
  ConsentDto,
  EmploymentDto,
  NextOfKinDto,
  PersonalInfoDto,
  ProductsServicesDto,
  ReferralDto,
} from './dto/step.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  // Called when the member lands on Step 1, before the phone number is even entered.
  @Post()
  create() {
    return this.service.createDraft();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneOrFail(id);
  }

  @Put(':id/consent')
  saveConsent(@Param('id') id: string, @Body() dto: ConsentDto) {
    return this.service.saveConsent(id, dto);
  }

  @Put(':id/personal-info')
  savePersonalInfo(@Param('id') id: string, @Body() dto: PersonalInfoDto) {
    return this.service.savePersonalInfo(id, dto);
  }

  @Put(':id/employment')
  saveEmployment(@Param('id') id: string, @Body() dto: EmploymentDto) {
    return this.service.saveEmployment(id, dto);
  }

  @Put(':id/products-services')
  saveProductsServices(@Param('id') id: string, @Body() dto: ProductsServicesDto) {
    return this.service.saveProductsServices(id, dto);
  }

  @Put(':id/referral')
  saveReferral(@Param('id') id: string, @Body() dto: ReferralDto) {
    return this.service.saveReferral(id, dto);
  }

  @Put(':id/next-of-kin')
  saveNextOfKin(@Param('id') id: string, @Body() dto: NextOfKinDto) {
    return this.service.saveNextOfKin(id, dto);
  }
}
