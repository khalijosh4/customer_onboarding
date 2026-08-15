import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from '../applications/entities/application.entity';
import { FortunePaymentsService } from './fortune-payments.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Application) private readonly applicationRepo: Repository<Application>,
    private readonly fortune: FortunePaymentsService,
    private readonly config: ConfigService,
  ) {}

  async initiateAccountOpeningPayment(applicationId: string, phoneNumberOverride?: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');

    if (!application.phoneVerified) {
      throw new BadRequestException('Phone number must be verified before payment');
    }

    const phoneNumber = phoneNumberOverride?.trim() || application.phoneNumber;
    if (!phoneNumber) {
      throw new BadRequestException('No phone number available to charge');
    }

    const minAmount = this.config.get<number>('MIN_ACCOUNT_OPENING_AMOUNT', 5);
    const shareValue = this.config.get<number>('SHARE_VALUE_KES', 1);
    const sharesTotal = (application.numberOfShares || 0) * shareValue;
    const amount = Math.max(minAmount, sharesTotal);

    // Settlement: the Fortune gateway credits the Sacco account using the
    // business number + account number. Use the explicitly configured test
    // account (FORTUNE_PAYMENTS_ACCOUNT_NUMBER) when present, otherwise fall
    // back to the member's national ID / reference number.
    const accountNumber =
      this.config.get<string>('FORTUNE_PAYMENTS_ACCOUNT_NUMBER', '') ||
      application.documentIdNumber ||
      application.referenceNumber ||
      application.phoneNumber;

    const result = await this.fortune.stkPush({
      phoneNumber,
      amount,
      reason: `Fortune Sacco account opening - ${application.referenceNumber}`,
      accountNumber,
      businessNumber: this.config.get<string>('FORTUNE_PAYMENTS_BUSINESS_NUMBER', '852648'),
    });

    application.mpesaCheckoutRequestId = result.requestId;
    application.merchantRequestId = result.requestId;
    application.amountPaid = amount;
    // Record the number the payment was actually initiated to.
    if (phoneNumberOverride?.trim()) application.phoneNumber = phoneNumber;
    await this.applicationRepo.save(application);

    return { checkoutRequestId: result.requestId, amount };
  }

  // Called by the Fortune C2B gateway callback after the customer completes
  // (or cancels) the STK push prompt. Matches by either the request id we got
  // at initiation or the gateway's checkout id.
  async confirmPayment(
    checkoutRequestId?: string,
    merchantRequestId?: string,
    mpesaReceiptNumber?: string,
    success = true,
  ) {
    if (!checkoutRequestId && !merchantRequestId) {
      this.logger.warn('Payment callback without an id');
      return;
    }

    const application = await this.applicationRepo
      .createQueryBuilder('a')
      .where('a.mpesaCheckoutRequestId = :co', { co: checkoutRequestId })
      .orWhere('a.merchantRequestId = :co', { co: checkoutRequestId })
      .orWhere('a.mpesaCheckoutRequestId = :mr', { mr: merchantRequestId })
      .orWhere('a.merchantRequestId = :mr', { mr: merchantRequestId })
      .getOne();

    if (!application) {
      this.logger.warn(
        `No application found for checkoutRequestId ${checkoutRequestId} / merchantRequestId ${merchantRequestId}`,
      );
      return;
    }

    if (success) {
      application.paymentCompleted = true;
      application.mpesaReceiptNumber = mpesaReceiptNumber || `MP-${Date.now()}`;
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

  // Diagnostic helper: sends a real KES 1 STK push to the given number so we can
  // verify the gateway auth + request contract end to end.
  async testStkPush(phoneNumber: string, amount = 1) {
    return this.fortune.stkPush({
      phoneNumber,
      amount,
      reason: 'Fortune C2B API test',
      // Use the configured settlement account; nothing signals a real credit.
      accountNumber:
        this.config.get<string>('FORTUNE_PAYMENTS_ACCOUNT_NUMBER', '') || 'TEST',
      businessNumber: this.config.get<string>('FORTUNE_PAYMENTS_BUSINESS_NUMBER', '852648'),
    });
  }

  // Re-registers the callback URL on demand (auto-registers before each push too).
  async registerCallback() {
    return this.fortune.registerCallbackUrl();
  }
}
