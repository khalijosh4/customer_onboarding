import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import dayjs from 'dayjs';

/**
 * Safaricom Daraja API — Lipa Na M-Pesa Online (STK Push).
 * Get consumer key/secret/passkey by creating an app at
 * https://developer.safaricom.co.ke (Sandbox first, then go-live for Production).
 */
@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('MPESA_ENV') === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    const consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.config.get<string>('MPESA_CONSUMER_SECRET');
    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const response = await axios.get(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    return response.data.access_token;
  }

  private buildPassword(timestamp: string): string {
    const shortcode = this.config.get<string>('MPESA_SHORTCODE');
    const passkey = this.config.get<string>('MPESA_PASSKEY');
    return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  }

  async stkPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
    const consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY');

    if (!consumerKey || consumerKey.startsWith('your_')) {
      // Dev fallback: no real Daraja credentials yet. Simulate a checkout request
      // so the rest of the flow (polling / admin review) can be exercised.
      this.logger.warn(
        `[DEV MODE - M-Pesa not configured] Simulating STK push of KES ${params.amount} to ${params.phoneNumber}`,
      );
      return {
        checkoutRequestId: `MOCK-${Date.now()}`,
        merchantRequestId: `MOCK-MR-${Date.now()}`,
      };
    }

    const timestamp = dayjs().format('YYYYMMDDHHmmss');
    const token = await this.getAccessToken();

    const response = await axios.post(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: this.config.get<string>('MPESA_SHORTCODE'),
        Password: this.buildPassword(timestamp),
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: params.amount,
        PartyA: this.formatMsisdn(params.phoneNumber),
        PartyB: this.config.get<string>('MPESA_SHORTCODE'),
        PhoneNumber: this.formatMsisdn(params.phoneNumber),
        CallBackURL: this.config.get<string>('MPESA_CALLBACK_URL'),
        AccountReference: params.accountReference,
        TransactionDesc: params.transactionDesc,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return {
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
    };
  }

  private formatMsisdn(phoneNumber: string): string {
    let msisdn = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    if (msisdn.startsWith('0')) msisdn = '254' + msisdn.slice(1);
    if (msisdn.startsWith('7') || msisdn.startsWith('1')) msisdn = '254' + msisdn;
    return msisdn;
  }
}
