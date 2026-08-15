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

    // The gateway collects onboarding fees into ONE Sacco account (the
    // collection account in FORTUNE_PAYMENTS_ACCOUNT_NUMBER). A new member has
    // no account yet, so the money is never charged to a customer account - it
    // pools in the collection account. After the admin approves the application
    // and the CBS creates the member's account, the funds are moved from the
    // collection account to the member account (settleCollectedFundsToMemberAccount).
    const accountNumber =
      this.config.get<string>('FORTUNE_PAYMENTS_ACCOUNT_NUMBER', '') ||
      application.referenceNumber;

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

  /**
   * Called after an admin approves the application and the CBS has created the
   * member's account. The onboarding fee sits in the Sacco collection account;
   * this is the seam that moves it into the member's new account (a CBS/GL
   * transfer). In mock mode we just record it; in live mode wire the real
   * CBS transfer API call here.
   */
  async settleCollectedFundsToMemberAccount(applicationId: string): Promise<Application> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');

    if (!application.paymentCompleted) {
      this.logger.warn(
        `No payment recorded for ${application.referenceNumber}; nothing to settle to member`,
      );
      return application;
    }

    if (this.config.get<string>('CBS_MODE', 'mock') === 'live') {
      // TODO: call the CBS transfer endpoint (e.g. POST {CBS_API_URL}/transfers)
      // moving application.amountPaid from the collection account into the
      // member account (application.cbsCustomerNumber). Mark the transfer only
      // once the CBS confirms it. Leave as-is if there is no CBS transfer API.
      this.logger.warn(
        `[CBS/LIVE] Fund settlement not wired yet - manual GL transfer needed for ${application.referenceNumber}`,
      );
    } else {
      this.logger.log(
        `[MOCK CBS] Settling KES ${application.amountPaid} from collection account to member ${application.referenceNumber}`,
      );
    }

    application.fundsTransferredToMemberAccount = true;
    await this.applicationRepo.save(application);
    return application;
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
