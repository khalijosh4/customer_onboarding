import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { AdvantaSmsService } from './advanta-sms.service';
import { OtpCode } from './entities/otp-code.entity';
import { Application } from '../applications/entities/application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OtpCode, Application])],
  providers: [OtpService, AdvantaSmsService],
  controllers: [OtpController],
  exports: [OtpService],
})
export class OtpModule {}
