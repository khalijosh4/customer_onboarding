import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

export enum DocumentKind {
  ID_FRONT = 'id_front',
  ID_BACK = 'id_back',
  SIGNATURE = 'signature',
  PASSPORT_PHOTO = 'passport_photo',
  LIVENESS_SELFIE = 'liveness_selfie',
}

@Entity('application_documents')
export class ApplicationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application, (application) => application.documents, {
    onDelete: 'CASCADE',
  })
  application: Application;

  @Column()
  applicationId: string;

  @Column({ type: 'enum', enum: DocumentKind })
  kind: DocumentKind;

  @Column()
  storagePath: string;

  @Column()
  originalFilename: string;

  @Column()
  mimeType: string;

  @Column()
  sizeBytes: number;

  @CreateDateColumn()
  createdAt: Date;
}
