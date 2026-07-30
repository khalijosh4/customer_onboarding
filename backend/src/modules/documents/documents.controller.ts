import {
  Body,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { DocumentKind } from './entities/application-document.entity';
import { documentFileFilter, documentStorage } from './storage.util';
import { IsArray, IsBoolean } from 'class-validator';

class LivenessDto {
  @IsArray()
  passportEmbedding: number[];

  @IsArray()
  selfieEmbedding: number[];

  @IsBoolean()
  livenessGesturePassed: boolean;
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post(':applicationId/upload/:kind')
  @UseInterceptors(
    FileInterceptor('file', { storage: documentStorage(), fileFilter: documentFileFilter }),
  )
  async upload(
    @Param('applicationId') applicationId: string,
    @Param('kind', new ParseEnumPipe(DocumentKind)) kind: DocumentKind,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.recordUpload(applicationId, kind, file);
  }

  @Post(':applicationId/liveness')
  async liveness(@Param('applicationId') applicationId: string, @Body() dto: LivenessDto) {
    return this.service.recordLiveness(
      applicationId,
      dto.passportEmbedding,
      dto.selfieEmbedding,
      dto.livenessGesturePassed,
    );
  }
}
