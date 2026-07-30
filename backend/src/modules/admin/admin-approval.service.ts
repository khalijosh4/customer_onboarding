import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from '../applications/entities/application.entity';
import { CbsService } from '../cbs/cbs.service';

/**
 * This is the critical hand-off point between the admin dashboard and the
 * Core Banking System: as soon as an admin approves an application, the
 * member's details are pushed to the CBS so a live customer/account record
 * is created there. If the CBS call fails, the application is marked
 * APPROVED but pushedToCbs stays false so it can be retried from the
 * admin dashboard rather than silently losing the approval.
 */
@Injectable()
export class AdminApprovalService {
  constructor(
    @InjectRepository(Application) private readonly repo: Repository<Application>,
    private readonly cbs: CbsService,
  ) {}

  async approveAndPushToCbs(applicationId: string, adminId: string) {
    const application = await this.repo.findOne({ where: { id: applicationId } });
    if (!application) throw new InternalServerErrorException('Application not found');

    application.status = ApplicationStatus.APPROVED;
    application.reviewedByAdminId = adminId;
    application.reviewedAt = new Date();
    await this.repo.save(application);

    const cbsResult = await this.cbs.createCustomer(application);

    if (cbsResult.success) {
      if (!cbsResult.cbsCustomerNumber) {
        throw new InternalServerErrorException('CBS returned success without a customer number');
      }

      application.pushedToCbs = true;
      application.pushedToCbsAt = new Date();
      application.cbsCustomerNumber = cbsResult.cbsCustomerNumber;
      await this.repo.save(application);
    }

    return application;
  }
}
