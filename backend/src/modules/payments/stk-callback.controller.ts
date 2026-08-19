import { Body, Controller, Get, Head, HttpCode, Logger, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';


@Controller('stk-callback')
export class StkCallbackController {
  private readonly logger = new Logger(StkCallbackController.name);

  constructor(private readonly service: PaymentsService) {}

  // Some webhook validators probe reachability with a GET/HEAD before challenging.
  @Get()
  @Head()
  @HttpCode(200)
  probe() {
    return { status: 'ok', message: 'Fortune Sacco STK callback endpoint' };
  }

  @Post()
  @HttpCode(200)
  async callback(@Body() body: any) {
    this.logger.log(`STK callback received: ${JSON.stringify(body)}`);

    if (body && typeof body.challenge === 'string') {
      return { challenge: body.challenge };
    }

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) return { ResultCode: 0, ResultDesc: 'Accepted' };

    const success = stkCallback.ResultCode === 0;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const receiptItem = stkCallback.CallbackMetadata?.Item?.find(
      (i: any) => i.Name === 'MpesaReceiptNumber',
    );

    await this.service.confirmPayment(checkoutRequestId, merchantRequestId, receiptItem?.Value, success);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}
