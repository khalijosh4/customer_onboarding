import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { OcrService } from './ocr.service';
import { LivenessService } from './liveness.service';
import { ApplicationDocument } from './entities/application-document.entity';
import { Application } from '../applications/entities/application.entity';
import { IprsModule } from '../iprs/iprs.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationDocument, Application]), IprsModule],
  providers: [DocumentsService, OcrService, LivenessService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
