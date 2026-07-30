import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from './entities/application.entity';
import {
  ConsentDto,
  EmploymentDto,
  NextOfKinDto,
  PersonalInfoDto,
  ProductsServicesDto,
  ReferralDto,
} from './dto/step.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application) private readonly repo: Repository<Application>,
  ) {}

  // Step 1 kicks off with an empty draft application before phone OTP is sent.
  async createDraft(): Promise<Application> {
    const count = await this.repo.count();
    const referenceNumber = `FS-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    const application = this.repo.create({
      referenceNumber,
      status: ApplicationStatus.DRAFT,
      currentStep: 1,
    });
    return this.repo.save(application);
  }

  async findOneOrFail(id: string): Promise<Application> {
    const application = await this.repo.findOne({ where: { id }, relations: ['documents'] });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  private assertEditable(application: Application) {
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new BadRequestException('This application has already been submitted and can no longer be edited');
    }
  }

  async saveConsent(id: string, dto: ConsentDto) {
    const application = await this.findOneOrFail(id);
    this.assertEditable(application);

    if (!dto.dataCollectionConsent || !dto.termsAccepted) {
      throw new BadRequestException(
        'You must accept the Terms & Conditions and consent to data collection to continue',
      );
    }

    application.dataCollectionConsent = dto.dataCollectionConsent;
    application.termsAccepted = dto.termsAccepted;
    application.consentTimestamp = new Date();
    if (application.currentStep < 3) application.currentStep = 3;
    return this.repo.save(application);
  }

  async savePersonalInfo(id: string, dto: PersonalInfoDto) {
    const application = await this.findOneOrFail(id);
    this.assertEditable(application);
    Object.assign(application, dto);
    if (application.currentStep < 4) application.currentStep = 4;
    return this.repo.save(application);
  }

  async saveEmployment(id: string, dto: EmploymentDto) {
    const application = await this.findOneOrFail(id);
    this.assertEditable(application);
    Object.assign(application, dto);
    if (application.currentStep < 5) application.currentStep = 5;
    return this.repo.save(application);
  }

  async saveProductsServices(id: string, dto: ProductsServicesDto) {
    const application = await this.findOneOrFail(id);
    this.assertEditable(application);
    Object.assign(application, dto);
    if (application.currentStep < 6) application.currentStep = 6;
    return this.repo.save(application);
  }

  async saveReferral(id: string, dto: ReferralDto) {
    const application = await this.findOneOrFail(id);
    this.assertEditable(application);
    Object.assign(application, dto);
    if (application.currentStep < 7) application.currentStep = 7;
    return this.repo.save(application);
  }

  async saveNextOfKin(id: string, dto: NextOfKinDto) {
    const application = await this.findOneOrFail(id);
    this.assertEditable(application);
    Object.assign(application, dto);
    if (application.currentStep < 8) application.currentStep = 8;
    return this.repo.save(application);
  }

  async listForAdmin(status?: ApplicationStatus) {
    return this.repo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      relations: ['documents'],
    });
  }

  async approve(id: string, adminId: string) {
    const application = await this.findOneOrFail(id);
    application.status = ApplicationStatus.APPROVED;
    application.reviewedByAdminId = adminId;
    application.reviewedAt = new Date();
    return this.repo.save(application);
  }

  async reject(id: string, adminId: string, reason: string) {
    const application = await this.findOneOrFail(id);
    application.status = ApplicationStatus.REJECTED;
    application.reviewedByAdminId = adminId;
    application.reviewedAt = new Date();
    application.rejectionReason = reason;
    return this.repo.save(application);
  }

  async save(application: Application) {
    return this.repo.save(application);
  }
}
