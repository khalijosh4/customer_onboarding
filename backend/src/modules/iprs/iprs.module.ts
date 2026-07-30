import { Module } from '@nestjs/common';
import { IprsService } from './iprs.service';

@Module({
  providers: [IprsService],
  exports: [IprsService],
})
export class IprsModule {}
