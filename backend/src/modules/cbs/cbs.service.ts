import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Application } from '../applications/entities/application.entity';

export interface CbsPushResult {
  success: boolean;
  cbsCustomerNumber?: string;
  raw?: Record<string, any>;
}

/**
 * Core Banking System (CBS) integration.
 *
 * CBS_MODE controls behaviour:
 *  - "mock"     (default): generates a fake CBS customer number locally so
 *                the admin approval workflow can be fully exercised before
 *                your CBS vendor issues sandbox credentials.
 *  - "live":    calls CBS_API_URL with CBS_API_KEY / CBS_API_SECRET.
 *
 * Swap CBS_MODE to "live" and fill in the credentials once your CBS vendor
 * (e.g. Craft Silicon Bankers Realm, Sagesoft, TransAfrica) has provisioned
 * your integration endpoint — no code changes required elsewhere, mirroring
 * the CBS_MODE toggle pattern used in the Ledger project.
 */
@Injectable()
export class CbsService {
  private readonly logger = new Logger(CbsService.name);

  constructor(private readonly config: ConfigService) {}

  async createCustomer(application: Application): Promise<CbsPushResult> {
    const mode = this.config.get<string>('CBS_MODE', 'mock');

    if (mode !== 'live') {
      const mockCustomerNumber = `CBS${Date.now().toString().slice(-8)}`;
      this.logger.warn(
        `[MOCK CBS] Creating customer for application ${application.referenceNumber} -> ${mockCustomerNumber}`,
      );
      return { success: true, cbsCustomerNumber: mockCustomerNumber };
    }

    try {
      const response = await axios.post(
        `${this.config.get<string>('CBS_API_URL')}/customers`,
        {
          branch_code: this.config.get<string>('CBS_BRANCH_CODE'),
          first_name: application.firstName,
          last_name: application.lastName,
          other_names: application.otherNames,
          id_number: application.documentIdNumber,
          date_of_birth: application.dateOfBirth,
          mobile_number: application.phoneNumber,
          account_type: application.accountType,
          shares: application.numberOfShares,
          products: application.selectedProducts,
        },
        {
          headers: {
            'X-Api-Key': this.config.get<string>('CBS_API_KEY'),
            'X-Api-Secret': this.config.get<string>('CBS_API_SECRET'),
          },
        },
      );

      return {
        success: true,
        cbsCustomerNumber: response.data.customer_number,
        raw: response.data,
      };
    } catch (error) {
      this.logger.error(`CBS customer creation failed: ${error.message}`);
      return { success: false, raw: { error: error.message } };
    }
  }
}
