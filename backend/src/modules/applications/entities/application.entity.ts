import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApplicationDocument } from '../../documents/entities/application-document.entity';

export enum ApplicationStatus {
  DRAFT = 'draft', // wizard in progress
  SUBMITTED = 'submitted', // step 9 payment completed, awaiting admin review
  UNDER_REVIEW = 'under_review', // admin is actively reviewing
  APPROVED = 'approved', // admin approved -> pushed to CBS
  REJECTED = 'rejected',
}

export enum DocumentIdType {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  OTHER = 'other',
}

export enum EmploymentStatus {
  CASUAL = 'casual',
  SELF_EMPLOYED = 'self_employed',
  FORMALLY_EMPLOYED = 'formally_employed',
  CONTRACT = 'contract',
  RETIRED = 'retired',
}

export enum StandingOrderFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Human-friendly reference shown to the member, e.g. FS-2026-000123
  @Column({ unique: true })
  referenceNumber: string;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.DRAFT })
  status: ApplicationStatus;

  // Highest step (1-9) the applicant has completed so far
  @Column({ default: 1 })
  currentStep: number;

  // ---------- STEP 1: Phone verification ----------
  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ default: false })
  phoneVerified: boolean;

  // ---------- STEP 2: Consent ----------
  @Column({ default: false })
  dataCollectionConsent: boolean;

  @Column({ default: false })
  termsAccepted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  consentTimestamp: Date;

  // ---------- STEP 3: Personal information ----------
  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  otherNames: string;

  @Column({ nullable: true })
  sex: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  countryOfResidence: string;

  @Column({ nullable: true })
  countyOfResidence: string;

  @Column({ nullable: true })
  cityOrTown: string;

  @Column({ nullable: true })
  maritalStatus: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  alternativeMobileNumber: string;

  @Column({ type: 'enum', enum: DocumentIdType, nullable: true })
  documentIdType: DocumentIdType;

  @Column({ nullable: true })
  documentIdNumber: string;

  @Column({ type: 'date', nullable: true })
  documentIssueDate: string;

  @Column({ type: 'date', nullable: true })
  documentExpiryDate: string;

  @Column({ nullable: true })
  residenceEstate: string;

  @Column({ nullable: true })
  physicalAddress: string;

  @Column({ nullable: true })
  nearestLandmark: string;

  // ---------- STEP 4: Employment ----------
  @Column({ type: 'enum', enum: EmploymentStatus, nullable: true })
  employmentStatus: EmploymentStatus;

  @Column({ nullable: true })
  employerOrBusinessName: string;

  @Column({ nullable: true })
  employerPhone: string;

  @Column({ nullable: true })
  workAddress: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  approximateMonthlyIncome: number;

  // ---------- STEP 5: Account, products & services ----------
  @Column({ nullable: true })
  accountType: string; // premium | zidisha | mwelekeo | business_saving | flexi

  @Column({ type: 'jsonb', nullable: true })
  selectedProducts: string[]; // jiinue | fixed_deposit | junior (multi-select)

  @Column({ default: 0 })
  numberOfShares: number;

  @Column({ default: false })
  standingOrderEnabled: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  standingOrderAmount: number;

  @Column({ type: 'enum', enum: StandingOrderFrequency, nullable: true })
  standingOrderFrequency: StandingOrderFrequency;

  @Column({ type: 'jsonb', nullable: true })
  selectedServices: string[]; // internet_banking | mobile_banking | business_paybill

  @Column({ nullable: true })
  businessName: string;

  @Column({ type: 'jsonb', nullable: true })
  businessPaybillNumbers: string[]; // 2 or more mobile numbers

  // ---------- STEP 6: Referral ----------
  @Column({ default: false })
  referredByStaff: boolean;

  @Column({ nullable: true })
  referralStaffPfNumber: string;

  @Column({ nullable: true })
  referralStaffName: string;

  // ---------- STEP 7: Next of kin / nominee ----------
  @Column({ nullable: true })
  nextOfKinName: string;

  @Column({ nullable: true })
  nextOfKinRelationship: string;

  @Column({ nullable: true })
  nextOfKinMobileNumber: string;

  // ---------- STEP 8: Documents / verification results ----------
  @Column({ default: false })
  idOcrCompleted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  idOcrExtractedData: Record<string, any>;

  @Column({ default: false })
  idOcrMatchesEnteredData: boolean;

  @Column({ default: false })
  iprsVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  iprsResponse: Record<string, any>;

  @Column({ default: false })
  livenessVerified: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  livenessMatchScore: number;

  // ---------- STEP 9: Payment ----------
  @Column({ default: false })
  paymentCompleted: boolean;

  @Column({ nullable: true })
  mpesaCheckoutRequestId: string;

  @Column({ nullable: true })
  merchantRequestId: string;

  @Column({ nullable: true })
  mpesaReceiptNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amountPaid: number;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date;

  // ---------- Admin review / CBS ----------
  @Column({ nullable: true })
  reviewedByAdminId: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  cbsCustomerNumber: string;

  @Column({ default: false })
  pushedToCbs: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  pushedToCbsAt: Date;

  @OneToMany(() => ApplicationDocument, (doc) => doc.application, { cascade: true })
  documents: ApplicationDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
