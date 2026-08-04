import { Body, Controller, Post } from '@nestjs/common';
import { IprsService, IprsVerifyParams } from './iprs.service';

@Controller('iprs')
export class IprsController {
  constructor(private readonly service: IprsService) {}

  /**
   * Dev/diagnostic endpoint: run a single live IPRS lookup against the
   * credentials in .env and see the parsed + raw result. Useful while wiring
   * up your gateway — POST {"idNumber":"42344860","firstName":"...",...}.
   */
  @Post('test')
  async test(@Body() params: IprsVerifyParams) {
    return this.service.verify({
      idNumber: params.idNumber,
      firstName: params.firstName || '',
      lastName: params.lastName || '',
      otherNames: params.otherNames,
      dateOfBirth: params.dateOfBirth,
    });
  }
}
