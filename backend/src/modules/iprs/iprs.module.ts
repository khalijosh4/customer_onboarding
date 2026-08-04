import { Module } from '@nestjs/common';
import { IprsService } from './iprs.service';
import { IprsController } from './iprs.controller';

@Module({
  controllers: [IprsController],
  providers: [IprsService],
  exports: [IprsService],
})
export class IprsModule {}
