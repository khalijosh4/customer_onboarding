import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface IprsVerificationResult {
  matched: boolean;
  source: 'live' | 'mock';
  iprsFullName?: string;
  raw?: Record<string, any>;
}

/**
 * Integrated Population Registration Services (IPRS) lookup.
 *
 * Fill IPRS_API_URL / IPRS_API_KEY / IPRS_CLIENT_ID / IPRS_CLIENT_SECRET in
 * .env with the credentials issued to Fortune Sacco once your IPRS
 * integration agreement is approved. Set IPRS_LIVE_MODE=true to call the
 * real endpoint; otherwise a deterministic mock responder is used so the
 * rest of the onboarding flow (and OCR cross-check) can be built and
 * demoed today.
 */
@Injectable()
export class IprsService {
  private readonly logger = new Logger(IprsService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(params: {
    idNumber: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
  }): Promise<IprsVerificationResult> {
    const liveMode = this.config.get<string>('IPRS_LIVE_MODE') === 'true';

    if (!liveMode) {
      return this.mockVerify(params);
    }

    try {
      const apiUrl = this.config.get<string>('IPRS_API_URL');
      if (!apiUrl) {
        throw new InternalServerErrorException('IPRS_API_URL is not configured');
      }

      const response = await axios.post(
        apiUrl,
        {
          id_number: params.idNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.get<string>('IPRS_API_KEY')}`,
            'X-Client-Id': this.config.get<string>('IPRS_CLIENT_ID'),
            'X-Client-Secret': this.config.get<string>('IPRS_CLIENT_SECRET'),
          },
        },
      );

      const iprsFullName: string = response.data?.full_name || '';
      const enteredFullName = `${params.firstName} ${params.otherNames || ''} ${params.lastName}`
        .replace(/\s+/g, ' ')
        .trim();

      const matched = this.namesRoughlyMatch(iprsFullName, enteredFullName);

      return { matched, source: 'live', iprsFullName, raw: response.data };
    } catch (error) {
      this.logger.error(`IPRS live lookup failed: ${error.message}`);
      return { matched: false, source: 'live', raw: { error: error.message } };
    }
  }

  private mockVerify(params: {
    idNumber: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
  }): IprsVerificationResult {
    this.logger.warn(
      `[DEV MODE - IPRS not configured] Mock-verifying ID ${params.idNumber} against name "${params.firstName} ${params.lastName}"`,
    );
    // Deterministic mock: treat as matched as long as the basics were supplied.
    // Replace with a live call once IPRS credentials are issued.
    const matched = Boolean(params.idNumber && params.firstName && params.lastName);
    return {
      matched,
      source: 'mock',
      iprsFullName: `${params.firstName} ${params.otherNames || ''} ${params.lastName}`.trim(),
    };
  }

  private namesRoughlyMatch(a: string, b: string): boolean {
    const normalize = (s: string) =>
      s
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .sort();
    const na = normalize(a);
    const nb = normalize(b);
    if (na.length === 0 || nb.length === 0) return false;
    const overlap = na.filter((token) => nb.includes(token));
    return overlap.length >= Math.min(2, na.length);
  }
}
