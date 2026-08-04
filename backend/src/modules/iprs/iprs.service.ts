import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface IprsVerificationResult {
  matched: boolean;
  source: 'live' | 'mock';
  iprsFullName?: string;
  iprsDateOfBirth?: string;
  iprsSerialNumber?: string;
  iprsGender?: string;
  iprsPhoto?: string;
  matchedFields?: { name: boolean; dateOfBirth: boolean };
  raw?: Record<string, any>;
  error?: string;
}

export interface IprsVerifyParams {
  idNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth?: string;
}

/**
 * Integrated Population Registration Services (IPRS) lookup via a KYC gateway.
 *
 * The gateway is configured in .env:
 *   IPRS_API_URL          - e.g. https://app.bongasms.co.ke/api/kyc
 *   IPRS_API_KEY          - key/token issued to the Sacco
 *   IPRS_CLIENT_ID        - client id (numeric for BongaSMS)
 *   IPRS_CLIENT_SECRET    - secret issued with the key
 *   IPRS_LIVE_MODE        - "true" to call the live endpoint, else the mock
 *   IPRS_AUTH_STYLE       - "query" (BongaSMS style: apiClientID/key/secret as
 *                           query params), "bearer", "headers", or "basic"
 *   IPRS_REQUEST_FIELD    - JSON body field that carries the ID number
 *                           (default "nationalID")
 *
 * Response parsing is deliberately tolerant: it digs into common wrappers
 * (data/result/response/payload/body) and reads many field aliases so the
 * exact gateway response shape doesn't need to be known up front.
 */
@Injectable()
export class IprsService {
  private readonly logger = new Logger(IprsService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(params: IprsVerifyParams): Promise<IprsVerificationResult> {
    const liveMode = this.config.get<string>('IPRS_LIVE_MODE') === 'true';

    if (!liveMode) {
      return this.mockVerify(params);
    }

    const apiUrl = this.config.get<string>('IPRS_API_URL');
    if (!apiUrl) {
      this.logger.error('IPRS_API_URL is not configured but IPRS_LIVE_MODE=true');
      return {
        matched: false,
        source: 'live',
        error: 'IPRS_API_URL is not configured',
      };
    }

    try {
      const { url, headers } = this.buildRequest(apiUrl);
      const requestField = this.config.get<string>('IPRS_REQUEST_FIELD', 'nationalID');

      const response = await axios.post(url, { [requestField]: params.idNumber }, {
        headers: { 'Content-Type': 'application/json', ...headers },
        timeout: 20000,
      });

      const payload = response.data;
      const person = this.extractPerson(payload);
      const matchedFields = {
        name: this.fullNameMatches(person.fullName, params),
        dateOfBirth: this.datesRoughlyMatch(person.dateOfBirth, params.dateOfBirth),
      };
      const matched = matchedFields.name && (params.dateOfBirth ? matchedFields.dateOfBirth : true);

      this.logger.log(
        `IPRS live lookup for ID ${params.idNumber}: ${matched ? 'MATCH' : 'no match'} (${JSON.stringify(person)})`,
      );

      return {
        matched,
        source: 'live',
        iprsFullName: person.fullName,
        iprsDateOfBirth: person.dateOfBirth,
        iprsSerialNumber: person.serialNumber,
        iprsGender: person.gender,
        iprsPhoto: person.photo,
        matchedFields,
        raw: payload,
      };
    } catch (error: any) {
      const rawText = error?.response?.data;
      const message =
        error?.response
          ? `${error.message}: ${JSON.stringify(rawText ?? {}).slice(0, 500)}`
          : error?.message || 'unknown error';
      this.logger.error(`IPRS live lookup failed — ${message}`);
      return {
        matched: false,
        source: 'live',
        error: String(message),
        raw: typeof rawText === 'object' ? rawText : { message: String(rawText ?? error?.message ?? '') },
      };
    }
  }

  /**
   * Builds the request per the configured auth style. BongaSMS-style gateways
   * expect apiClientID/key/secret as query parameters; others use headers.
   */
  private buildRequest(apiUrl: string): { url: string; headers: Record<string, string> } {
    const key = this.config.get<string>('IPRS_API_KEY', '');
    const clientId = this.config.get<string>('IPRS_CLIENT_ID', '');
    const secret = this.config.get<string>('IPRS_CLIENT_SECRET', '');
    const style = this.config.get<string>('IPRS_AUTH_STYLE', 'query');

    switch (style) {
      case 'bearer':
        return { url: apiUrl, headers: { Authorization: `Bearer ${key}` } };
      case 'headers':
        return {
          url: apiUrl,
          headers: {
            Authorization: `Bearer ${key}`,
            'X-Client-Id': clientId,
            'X-Client-Secret': secret,
            'X-Api-Key': key,
          },
        };
      case 'basic': {
        const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
        return { url: apiUrl, headers: { Authorization: `Basic ${auth}` } };
      }
      case 'query':
      default: {
        const sep = apiUrl.includes('?') ? '&' : '?';
        return {
          url: `${apiUrl}${sep}apiClientID=${encodeURIComponent(clientId)}&key=${encodeURIComponent(
            key,
          )}&secret=${encodeURIComponent(secret)}`,
          headers: {},
        };
      }
    }
  }

  /**
   * Pulls the subject's details out of a gateway payload no matter how it is
   * nested or named. Returns an empty person object if nothing is found.
   */
  private extractPerson(payload: any): {
    fullName: string;
    firstName?: string;
    surname?: string;
    otherNames?: string;
    dateOfBirth?: string;
    gender?: string;
    serialNumber?: string;
    photo?: string;
  } {
    const obj = this.firstObject(payload);
    if (!obj) return { fullName: '' };

    const fullName = this.pick(obj, ['full_name', 'fullName', 'name', 'names']);
    const firstName = this.pick(obj, ['first_name', 'firstName', 'given_name', 'givenName']);
    const surname = this.pick(obj, ['surname', 'last_name', 'lastName', 'family_name', 'familyName']);
    const otherNames = this.pick(obj, ['other_name', 'otherName', 'other_names', 'middle_name', 'middleName']);
    const dateOfBirth = this.pick(obj, ['date_of_birth', 'dateOfBirth', 'dob', 'DOB']);
    const gender = this.pick(obj, ['gender', 'sex']);
    const serialNumber = this.pick(obj, ['serial_number', 'serialNumber', 'serial_no']);
    const photo = this.pick(obj, ['photo', 'picture', 'image', 'portrait']);

    const combined =
      fullName ||
      [firstName, otherNames, surname].filter((v) => !!v && v.trim()).join(' ').replace(/\s+/g, ' ').trim();

    return {
      fullName: combined,
      firstName,
      surname,
      otherNames,
      dateOfBirth,
      gender,
      serialNumber,
      photo,
    };
  }

  /** Returns the first object that looks like the subject record (or the payload itself). */
  private firstObject(payload: any): any {
    if (!payload) return null;
    if (typeof payload !== 'object') return null;
    for (const key of ['data', 'result', 'response', 'payload', 'body']) {
      const candidate = payload[key];
      if (candidate && typeof candidate === 'object') return candidate;
    }
    return payload;
  }

  private pick(obj: any, keys: string[]): string | undefined {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        const v = typeof obj[key] === 'string' ? obj[key] : JSON.stringify(obj[key]);
        if (v && v !== '{}') return v;
      }
    }
    return undefined;
  }

  /**
   * Requires the entered first and last name to both appear in the IPRS name.
   * Kenyan IPRS returns surname + first name + other names; this tolerates
   * name ordering and middle names being omitted from the form.
   */
  private fullNameMatches(iprsName: string, entered: IprsVerifyParams): boolean {
    const haystack = iprsName.toUpperCase();
    const first = (entered.firstName || '').toUpperCase().trim();
    const last = (entered.lastName || '').toUpperCase().trim();
    const other = (entered.otherNames || '').toUpperCase().trim();

    const tokens = [first, last, ...(other ? other.split(/\s+/) : [])].filter(Boolean);
    if (tokens.length === 0) return false;
    return tokens.every((t) => haystack.includes(t));
  }

  /** Compares two dates with a 1-day tolerance, accepting ISO or day-first formats. */
  private datesRoughlyMatch(iprsDate?: string, enteredDate?: string): boolean {
    if (!iprsDate || !enteredDate) return true;
    const o = this.normalizeDate(iprsDate);
    const e = this.normalizeDate(enteredDate);
    if (!o || !e) return true;
    if (o[0] === '00' || o[1] === '00') return false;
    if (o[0] === e[0] && o[1] === e[1] && o[2] === e[2]) return true;
    const oDays = Date.UTC(+o[2], +o[1] - 1, +o[0]);
    const eDays = Date.UTC(+e[2], +e[1] - 1, +e[0]);
    return Math.abs(oDays - eDays) <= 86400000;
  }

  private normalizeDate(value: string): string[] | null {
    const v = value.trim();
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return [m[3].padStart(2, '0'), m[2].padStart(2, '0'), m[1]];
    m = v.match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/);
    if (m) {
      const year = m[3].length === 2 ? `19${m[3]}` : m[3];
      return [m[1].padStart(2, '0'), m[2].padStart(2, '0'), year];
    }
    return null;
  }

  private mockVerify(params: IprsVerifyParams): IprsVerificationResult {
    this.logger.warn(
      `[DEV MODE - IPRS not configured] Mock-verifying ID ${params.idNumber} against name "${params.firstName} ${params.lastName}"`,
    );
    const matched = Boolean(params.idNumber && params.firstName && params.lastName);
    return {
      matched,
      source: 'mock',
      iprsFullName: `${params.firstName} ${params.otherNames || ''} ${params.lastName}`.replace(/\s+/g, ' ').trim(),
      iprsDateOfBirth: params.dateOfBirth,
      matchedFields: { name: matched, dateOfBirth: true },
    };
  }
}
