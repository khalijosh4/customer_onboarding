import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../applications/entities/application.entity';
import { ApplicationDocument, DocumentKind } from './entities/application-document.entity';
import { OcrService } from './ocr.service';
import { IprsService } from '../iprs/iprs.service';
import { LivenessService } from './liveness.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  constructor(
    @InjectRepository(Application) private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ApplicationDocument)
    private readonly documentRepo: Repository<ApplicationDocument>,
    private readonly ocr: OcrService,
    private readonly iprs: IprsService,
    private readonly liveness: LivenessService,
  ) {}

  private async getApplication(applicationId: string): Promise<Application> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async recordUpload(
    applicationId: string,
    kind: DocumentKind,
    file: Express.Multer.File,
  ): Promise<ApplicationDocument> {
    const application = await this.getApplication(applicationId);

    const doc = this.documentRepo.create({
      applicationId,
      kind,
      storagePath: file.path,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
    await this.documentRepo.save(doc);

    // Run OCR + IPRS cross-check automatically once the front of the ID is uploaded.
    if (kind === DocumentKind.ID_FRONT) {
      // Fire-and-forget: process OCR/IPRS in background so upload request returns fast.
      this.runOcrAndIprs(application, file.path).catch((err) => {
        this.logger.error(`Background OCR/IPRS processing failed for ${file.path}: ${err?.message || err}`);
      });
    }

    return doc;
  }

  private async runOcrAndIprs(application: Application, filePath: string) {
    const extracted = await this.ocr.extractFromImage(filePath);

    const matches = this.ocr.matchesEnteredData(extracted, {
      idNumber: application.documentIdNumber || '',
      firstName: application.firstName || '',
      lastName: application.lastName || '',
      dateOfBirth: application.dateOfBirth || '',
      documentIssueDate: application.documentIssueDate || '',
    });

    application.idOcrCompleted = true;
    application.idOcrExtractedData = extracted as unknown as Record<string, any>;
    application.idOcrMatchesEnteredData = matches;

    const iprsResult = await this.iprs.verify({
      idNumber: application.documentIdNumber,
      firstName: application.firstName,
      lastName: application.lastName,
      otherNames: application.otherNames,
    });

    application.iprsVerified = iprsResult.matched;
    application.iprsResponse = iprsResult as unknown as Record<string, any>;

    await this.applicationRepo.save(application);
  }

  async recordLiveness(
    applicationId: string,
    passportEmbedding: number[],
    selfieEmbedding: number[],
    livenessGesturePassed: boolean,
  ) {
    const application = await this.getApplication(applicationId);
    const result = this.liveness.evaluate(passportEmbedding, selfieEmbedding, livenessGesturePassed);

    application.livenessVerified = result.verified;
    application.livenessMatchScore = result.matchScore;
    if (application.currentStep < 9) application.currentStep = 9;
    await this.applicationRepo.save(application);

    return result;
  }

  async listDocuments(applicationId: string) {
    return this.documentRepo.find({ where: { applicationId } });
  }
}
