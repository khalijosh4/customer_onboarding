import { BadRequestException, Body, Controller, Logger, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly service: PaymentsService) {}

  @Post(':applicationId/stk-push')
  initiate(@Param('applicationId') applicationId: string, @Body() body: { phoneNumber?: string }) {
    return this.service.initiateAccountOpeningPayment(applicationId, body?.phoneNumber);
  }

  // Public endpoint the Fortune C2B gateway POSTs to once the customer completes
  // (or cancels) the STK push prompt on their phone. Must be reachable over
  // HTTPS from the internet (configure FORTUNE_PAYMENTS_CALLBACK_URL accordingly).
  @Post('callback')
  async callback(@Body() body: any) {
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return { ResultCode: 0, ResultDesc: 'Accepted' };

    this.logger.log(
      `STK callback received: ${JSON.stringify({
        ResultCode: stkCallback.ResultCode,
        ResultDesc: stkCallback.ResultDesc,
        CheckoutRequestID: stkCallback.CheckoutRequestID,
        MerchantRequestID: stkCallback.MerchantRequestID,
      })}`,
    );

    const success = stkCallback.ResultCode === 0;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const receiptItem = stkCallback.CallbackMetadata?.Item?.find(
      (i: any) => i.Name === 'MpesaReceiptNumber',
    );

    await this.service.confirmPayment(checkoutRequestId, merchantRequestId, receiptItem?.Value, success);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  // Convenience endpoint for local development — marks the application as paid
  // without a real STK push.
  @Post(':applicationId/dev-simulate')
  simulate(@Param('applicationId') applicationId: string) {
    return this.service.devSimulatePayment(applicationId);
  }

  // Diagnostic: sends a real STK push to verify gateway auth + contract.
  // POST /api/payments/test {"phoneNumber":"2547xxxxxxxx","amount":10,"accountNumber":"42344860"}
  @Post('test')
  test(@Body() body: { phoneNumber?: string; amount?: number; accountNumber?: string }) {
    if (!body.phoneNumber) throw new BadRequestException('phoneNumber is required');
    return this.service.testStkPush(body.phoneNumber, body.amount, body.accountNumber);
  }

  // Re-registers the callback URL (also happens automatically before each push).
  // Useful for debugging the challenge-response flow.
  @Post('register-callback')
  registerCallback() {
    return this.service.registerCallback();
  }
}
