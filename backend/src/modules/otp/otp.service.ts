import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { OtpCode } from './entities/otp-code.entity';
import { AdvantaSmsService } from './advanta-sms.service';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode) private readonly otpRepo: Repository<OtpCode>,
    private readonly sms: AdvantaSmsService,
    private readonly config: ConfigService,
  ) {}

  private generateCode(): string {
    const length = this.config.get<number>('OTP_LENGTH', 6);
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  async requestOtp(phoneNumber: string): Promise<{ sent: boolean; expiresInMinutes: number }> {
    if (!/^(?:\+?254|0)?7\d{8}$/.test(phoneNumber.replace(/\s+/g, ''))) {
      throw new BadRequestException('Please enter a valid Kenyan mobile number');
    }

    const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES', 5);
    const code = this.generateCode();
    const expiresAt = dayjs().add(expiryMinutes, 'minute').toDate();

    const otp = this.otpRepo.create({ phoneNumber, code, expiresAt });
    await this.otpRepo.save(otp);

    await this.sms.sendSms(
      phoneNumber,
      `Your Fortune Sacco verification code is ${code}. It expires in ${expiryMinutes} minutes. Do not share this code with anyone.`,
    );

    return { sent: true, expiresInMinutes: expiryMinutes };
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const otp = await this.otpRepo.findOne({
      where: {
        phoneNumber,
        verified: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('No active verification code found. Please request a new one.');
    }

    if (otp.attempts >= 5) {
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    if (otp.code !== code) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      throw new BadRequestException('Incorrect verification code');
    }

    otp.verified = true;
    await this.otpRepo.save(otp);
    return true;
  }
}
