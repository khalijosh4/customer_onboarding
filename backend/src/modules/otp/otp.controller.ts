import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { Application } from '../applications/entities/application.entity';

@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
  ) {}

  @Post('request')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto.phoneNumber);
  }

  @Post('verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.phoneNumber, dto.code);

    const application = await this.applicationRepo.findOne({ where: { id: dto.applicationId } });
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    application.phoneNumber = dto.phoneNumber;
    application.phoneVerified = true;
    if (application.currentStep < 2) application.currentStep = 2;
    await this.applicationRepo.save(application);

    return { verified: true, applicationId: application.id, currentStep: application.currentStep };
  }
}
