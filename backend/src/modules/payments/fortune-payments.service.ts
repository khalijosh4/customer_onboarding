import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

export interface FortuneStkPushParams {
  phoneNumber: string;
  amount: number;
  reason: string;
  accountNumber?: string;
}

export interface FortuneStkPushResult {
  requestId: string;
  responseCode: string;
  responseDescription: string;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class FortunePaymentsService {
  private readonly logger = new Logger(FortunePaymentsService.name);
  private tokenCache: TokenCache | null = null;
  private callbackRegistered = false;

  constructor(private readonly config: ConfigService) {
    // Don't trust a stored registration: ephemeral tunnels (e.g. trycloudflare)
    // die between restarts, so a persisted URL can silently be dead. Re-validate
    // on every boot - a dead URL fails loudly on the first push and recovers
    // automatically as soon as the tunnel is back up.
    this.ensureCallbackRegistered().catch((err) => {
      this.logger.warn(`Initial callback registration failed: ${err.message}`);
    });
  }

  private get baseUrl(): string {
    return this.config.get<string>(
      'FORTUNE_PAYMENTS_BASE_URL',
      'https://api-payments-prod.fortune.co.ke/api/v1',
    );
  }

  private get credentialsPath(): string {
    return join(process.cwd(), 'webhook-credentials.json');
  }

  private persistSecretKey(secretKey: string) {
    try {
      writeFileSync(
        this.credentialsPath,
        JSON.stringify(
          {
            callback_url: this.config.get<string>('FORTUNE_PAYMENTS_CALLBACK_URL'),
            secret_key: secretKey,
            registered_at: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    } catch (err: any) {
      this.logger.warn(`Could not persist webhook secret: ${err.message}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.accessToken;
    }

    const url = `${this.baseUrl}/auth/authorize`;
    const clientKey = this.config.get<string>('FORTUNE_PAYMENTS_CLIENT_KEY', '');
    const clientSecret = this.config.get<string>('FORTUNE_PAYMENTS_CLIENT_SECRET', '');

    this.logger.log(`Authorizing against Fortune C2B -> ${url}`);

    let response;
    try {
      response = await axios.post(
        url,
        { client_key: clientKey, client_secret: clientSecret },
        { headers: { 'Content-Type': 'application/json' } },
      );
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`Fortune C2B authorize failed: ${JSON.stringify(detail)}`);
      throw new BadRequestException(`Fortune C2B authorize failed: ${JSON.stringify(detail)}`);
    }

    const data = response.data;
    // Production returns {token, expires}; docs describe {access_token, expires_in}.
    const accessToken = data?.access_token ?? data?.token;
    if (!accessToken) {
      this.logger.error(`Fortune C2B authorize unexpected response: ${JSON.stringify(data)}`);
      throw new BadRequestException('Could not obtain a Fortune C2B access token');
    }

    const expiresIn = Number(data?.expires_in ?? data?.expires) || 599;
    this.tokenCache = {
      accessToken,
      // Refresh ~30s before the token actually expires.
      expiresAt: Date.now() + (expiresIn - 30) * 1000,
    };
    this.logger.log('Fortune C2B access token acquired');
    return this.tokenCache.accessToken;
  }

  /**
   * Registers our callback_url so the gateway can deliver STK results.
   * The gateway challenges the URL and expects an identical {challenge} echo.
   */
  async registerCallbackUrl(): Promise<{ success: boolean; secretKey?: string; error?: string }> {
    const url = `${this.baseUrl}/service/registerurl`;
    const token = await this.getAccessToken();
    const body = {
      client_key: this.config.get<string>('FORTUNE_PAYMENTS_CLIENT_KEY', ''),
      callback_url: this.config.get<string>('FORTUNE_PAYMENTS_CALLBACK_URL', ''),
    };

    this.logger.log(`Registering Fortune C2B callback -> ${url} (${body.callback_url})`);

    let response;
    try {
      response = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`Fortune C2B registerurl failed: ${JSON.stringify(detail)}`);
      return { success: false, error: JSON.stringify(detail) };
    }

    const data = response.data ?? {};
    if (data?.message) {
      this.logger.log(`Fortune C2B callback registration: ${data.message}`);
      if (data?.secret_key) this.persistSecretKey(data.secret_key);
      return { success: true, secretKey: data.secret_key };
    }

    this.logger.error(`Fortune C2B registerurl unexpected response: ${JSON.stringify(data)}`);
    return { success: false, error: JSON.stringify(data) };
  }

  private isInvalidTokenError(err: any): boolean {
    const detail = err?.detail ?? err?.response?.data ?? err?.message ?? err;
    return JSON.stringify(detail).includes('Invalid or expired token');
  }

  private async ensureCallbackRegistered(): Promise<void> {
    if (this.callbackRegistered) return;
    const result = await this.registerCallbackUrl();
    if (!result.success) {
      // The gateway may have invalidated the cached token (e.g. another process
      // shares the client credentials). Refresh once and retry before giving up.
      if (this.isInvalidTokenError(result.error)) {
        this.logger.warn('Fortune C2B token invalid during callback registration, refreshing');
        this.tokenCache = null;
        const retry = await this.registerCallbackUrl();
        if (retry.success) {
          this.callbackRegistered = true;
          return;
        }
        result.error = retry.error;
      }
      throw new BadRequestException(
        `Could not register the Fortune C2B callback URL: ${result.error || 'unknown error'}`,
      );
    }
    this.callbackRegistered = true;
  }

  async stkPush(params: FortuneStkPushParams): Promise<FortuneStkPushResult> {
    await this.ensureCallbackRegistered();
    try {
      return await this.sendStkPush(params);
    } catch (err: any) {
      // Gateway invalidated the cached token; refresh and retry the push once.
      if (this.isInvalidTokenError(err)) {
        this.logger.warn('Fortune C2B token invalid during STK push, refreshing and retrying');
        this.tokenCache = null;
        return this.sendStkPush(params);
      }
      throw err;
    }
  }

  private async sendStkPush(params: FortuneStkPushParams): Promise<FortuneStkPushResult> {
    const url = `${this.baseUrl}/payments/stk_push`;
    const token = await this.getAccessToken();

    // The gateway is Fortune's own C2B STK push API. Its documented contract is
    // amount / phone_number / reason / callback_url. `account_number` is the
    // extra field the gateway uses to route the deposit to the target account
    // (the Sacco collection/merchant account, e.g. 144706) so the payment can
    // settle. Falls back to the params value if a caller overrides it.
    const body: Record<string, unknown> = {
      amount: params.amount,
      phone_number: this.formatMsisdn(params.phoneNumber),
      reason: params.reason,
      callback_url: this.config.get<string>('FORTUNE_PAYMENTS_CALLBACK_URL', ''),
      account_number:
        params.accountNumber || this.config.get<string>('FORTUNE_PAYMENTS_ACCOUNT_NUMBER', ''),
    };

    this.logger.log(
      `Fortune C2B STK push -> ${url} body=${JSON.stringify({ ...body, callback_url: undefined })}`,
    );

    let response;
    try {
      response = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      const detail = err?.response?.data ?? err?.message;
      this.logger.error(`Fortune C2B request failed: ${JSON.stringify(detail)}`);
      const wrapped = new BadRequestException(
        `Fortune C2B request failed: ${JSON.stringify(detail)}`,
      );
      (wrapped as any).detail = detail;
      throw wrapped;
    }

    const data = response.data;
    this.logger.log(`Fortune C2B response: ${JSON.stringify(data)}`);

    if (data?.ResponseCode !== '0') {
      throw new BadRequestException(
        data?.ResponseDescription || 'STK push was not accepted by the Fortune payments gateway',
      );
    }

    return {
      requestId: data.requestId,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
    };
  }

  private formatMsisdn(phoneNumber: string): string {
    let msisdn = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    if (msisdn.startsWith('0')) msisdn = '254' + msisdn.slice(1);
    if (msisdn.startsWith('7') || msisdn.startsWith('1')) msisdn = '254' + msisdn;
    return msisdn;
  }
}
