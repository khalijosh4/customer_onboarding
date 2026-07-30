import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DocumentIdType,
  EmploymentStatus,
  StandingOrderFrequency,
} from '../entities/application.entity';

export class ConsentDto {
  @IsBoolean()
  dataCollectionConsent: boolean;

  @IsBoolean()
  termsAccepted: boolean;
}

export class PersonalInfoDto {
  @IsString() lastName: string;
  @IsString() firstName: string;
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  otherNames?: string;
  @IsIn(['Male', 'Female']) sex: string;
  @IsString() nationality: string;
  @IsString() countryOfResidence: string;
  @IsString() countyOfResidence: string;
  @IsString() cityOrTown: string;
  @IsString() maritalStatus: string;
  @IsDateString() dateOfBirth: string;
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  alternativeMobileNumber?: string;
  @IsEnum(DocumentIdType) documentIdType: DocumentIdType;
  @IsString() documentIdNumber: string;
  @IsDateString() documentIssueDate: string;
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  documentExpiryDate?: string;
  @IsString() residenceEstate: string;
  @IsString() physicalAddress: string;
  @IsString() nearestLandmark: string;
}

export class EmploymentDto {
  @IsEnum(EmploymentStatus) employmentStatus: EmploymentStatus;

  @ValidateIf(
    (o) =>
      o.employmentStatus === EmploymentStatus.FORMALLY_EMPLOYED ||
      o.employmentStatus === EmploymentStatus.CONTRACT ||
      o.employmentStatus === EmploymentStatus.RETIRED,
  )
  @IsString()
  employerOrBusinessName?: string;

  @IsOptional() @IsString() employerPhone?: string;

  @ValidateIf(
    (o) =>
      o.employmentStatus === EmploymentStatus.FORMALLY_EMPLOYED ||
      o.employmentStatus === EmploymentStatus.CONTRACT ||
      o.employmentStatus === EmploymentStatus.RETIRED,
  )
  @IsString()
  workAddress?: string;

  @IsNumber() @Min(0) approximateMonthlyIncome: number;
}

export class ProductsServicesDto {
  @IsIn(['premium', 'zidisha', 'mwelekeo', 'business_saving', 'flexi'])
  accountType: string;

  @IsArray()
  @IsIn(['jiinue', 'fixed_deposit', 'junior'], { each: true })
  selectedProducts: string[];

  @IsNumber() @Min(0) numberOfShares: number;

  @IsBoolean() standingOrderEnabled: boolean;

  @ValidateIf((o) => o.standingOrderEnabled)
  @IsNumber()
  @Min(1)
  standingOrderAmount?: number;

  @ValidateIf((o) => o.standingOrderEnabled)
  @IsEnum(StandingOrderFrequency)
  standingOrderFrequency?: StandingOrderFrequency;

  @IsArray()
  @IsIn(['internet_banking', 'mobile_banking', 'business_paybill'], { each: true })
  selectedServices: string[];

  @ValidateIf((o) => o.selectedServices?.includes('business_paybill'))
  @IsString()
  businessName?: string;

  @ValidateIf((o) => o.selectedServices?.includes('business_paybill'))
  @IsArray()
  @ArrayMinSize(2)
  businessPaybillNumbers?: string[];
}

export class ReferralDto {
  @IsBoolean() referredByStaff: boolean;

  @ValidateIf((o) => o.referredByStaff)
  @IsString()
  referralStaffPfNumber?: string;

  @ValidateIf((o) => o.referredByStaff)
  @IsString()
  referralStaffName?: string;
}

export class NextOfKinDto {
  @IsString() nextOfKinName: string;
  @IsString() nextOfKinRelationship: string;
  @IsString() nextOfKinMobileNumber: string;
}
