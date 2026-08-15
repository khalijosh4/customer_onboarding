import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
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
    // Concurrent requests (e.g. a page refresh while a draft is still creating,
    // or two tabs opened at once) can calculate the same next number and then
    // collide on the unique referenceNumber column. Retry on a unique violation
    // until we claim an unused number instead of surfacing a 500.
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const referenceNumber = await this.nextReferenceNumber();
      try {
        const application = this.repo.create({
          referenceNumber,
          status: ApplicationStatus.DRAFT,
          currentStep: 1,
        });
        return await this.repo.save(application);
      } catch (err) {
        if (!this.isReferenceCollision(err)) throw err;
        // Another request claimed this number first - loop and take the next one.
      }
    }
    throw new ConflictException('Could not allocate a reference number. Please retry.');
  }

  private async nextReferenceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `FS-${currentYear}-`;
    // Compute the next number from the highest existing number for this year, so
    // gaps/deletions can never collide with the unique column.
    const row = await this.repo
      .createQueryBuilder('app')
      .select('MAX(app.referenceNumber)', 'max')
      .where('app.referenceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .getRawOne<{ max: string | null }>();
    const lastNumber = row?.max ? parseInt(row.max.slice(prefix.length), 10) || 0 : 0;
    return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
  }

  private isReferenceCollision(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const driverError: any = (err as any).driverError;
    if (!driverError) return false;
    const constraint = String(driverError.constraint ?? '');
    if (/referenceNumber/i.test(constraint)) return true;
    const code = String(driverError.code ?? '').toUpperCase();
    if (code === '23505') return true; // PostgreSQL unique violation
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT') return true; // SQLite
    const message = String(driverError.message ?? '');
    if (driverError.errorNum === 1 || /ORA-00001|UNIQUE CONSTRAINT/i.test(message)) return true; // Oracle
    return false;
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
