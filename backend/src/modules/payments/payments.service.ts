import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from '../applications/entities/application.entity';
import { MpesaService } from './mpesa.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Application) private readonly applicationRepo: Repository<Application>,
    private readonly mpesa: MpesaService,
    private readonly config: ConfigService,
  ) {}

  async initiateAccountOpeningPayment(applicationId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');

    if (!application.phoneVerified) {
      throw new BadRequestException('Phone number must be verified before payment');
    }

    const minAmount = this.config.get<number>('MIN_ACCOUNT_OPENING_AMOUNT', 1000);
    const shareValue = this.config.get<number>('SHARE_VALUE_KES', 100);
    const sharesTotal = (application.numberOfShares || 0) * shareValue;
    const amount = Math.max(minAmount, sharesTotal);

    const { checkoutRequestId } = await this.mpesa.stkPush({
      phoneNumber: application.phoneNumber,
      amount,
      accountReference: application.referenceNumber,
      transactionDesc: `Fortune Sacco account opening - ${application.referenceNumber}`,
    });

    application.mpesaCheckoutRequestId = checkoutRequestId;
    application.amountPaid = amount;
    await this.applicationRepo.save(application);

    return { checkoutRequestId, amount };
  }

  // Called by Safaricom's Daraja callback, or by the dev "simulate payment"
  // endpoint below when running without live M-Pesa credentials.
  async confirmPayment(checkoutRequestId: string, mpesaReceiptNumber: string, success: boolean) {
    const application = await this.applicationRepo.findOne({
      where: { mpesaCheckoutRequestId: checkoutRequestId },
    });
    if (!application) {
      this.logger.warn(`No application found for checkoutRequestId ${checkoutRequestId}`);
      return;
    }

    if (success) {
      application.paymentCompleted = true;
      application.mpesaReceiptNumber = mpesaReceiptNumber;
      application.status = ApplicationStatus.SUBMITTED;
      application.submittedAt = new Date();
    }

    await this.applicationRepo.save(application);
    return application;
  }

  async devSimulatePayment(applicationId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');

    application.paymentCompleted = true;
    application.mpesaReceiptNumber = `SIM${Date.now()}`;
    application.status = ApplicationStatus.SUBMITTED;
    application.submittedAt = new Date();
    return this.applicationRepo.save(application);
  }
}
