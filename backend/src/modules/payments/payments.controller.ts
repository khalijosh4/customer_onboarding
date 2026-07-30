import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post(':applicationId/mpesa/stk-push')
  initiate(@Param('applicationId') applicationId: string) {
    return this.service.initiateAccountOpeningPayment(applicationId);
  }

  // Public endpoint Safaricom Daraja POSTs to once the customer completes
  // (or cancels) the STK push prompt on their phone. Must be reachable over
  // HTTPS from the internet (configure MPESA_CALLBACK_URL accordingly).
  @Post('mpesa/callback')
  async callback(@Body() body: any) {
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return { ResultCode: 0, ResultDesc: 'Accepted' };

    const success = stkCallback.ResultCode === 0;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const receiptItem = stkCallback.CallbackMetadata?.Item?.find(
      (i: any) => i.Name === 'MpesaReceiptNumber',
    );

    await this.service.confirmPayment(checkoutRequestId, receiptItem?.Value, success);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }

  // Convenience endpoint for local development when MPESA credentials are
  // not yet configured — marks the application as paid without a real STK push.
  @Post(':applicationId/mpesa/dev-simulate')
  simulate(@Param('applicationId') applicationId: string) {
    return this.service.devSimulatePayment(applicationId);
  }
}
