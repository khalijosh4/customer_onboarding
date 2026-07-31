export interface Application {
  id: string;
  referenceNumber: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  currentStep: number;

  phoneNumber?: string;
  phoneVerified: boolean;

  dataCollectionConsent: boolean;
  termsAccepted: boolean;

  lastName?: string;
  firstName?: string;
  otherNames?: string;
  sex?: string;
  nationality?: string;
  countryOfResidence?: string;
  countyOfResidence?: string;
  cityOrTown?: string;
  maritalStatus?: string;
  dateOfBirth?: string;
  alternativeMobileNumber?: string;
  documentIdType?: 'national_id' | 'passport' | 'other';
  documentIdNumber?: string;
  documentIssueDate?: string;
  documentExpiryDate?: string;
  residenceEstate?: string;
  physicalAddress?: string;
  nearestLandmark?: string;

  employmentStatus?: 'casual' | 'self_employed' | 'formally_employed' | 'contract' | 'retired';
  employerOrBusinessName?: string;
  employerPhone?: string;
  workAddress?: string;
  approximateMonthlyIncome?: number;

  accountType?: string;
  selectedProducts?: string[];
  numberOfShares?: number;
  standingOrderEnabled?: boolean;
  standingOrderAmount?: number;
  standingOrderFrequency?: 'weekly' | 'monthly' | 'quarterly';
  selectedServices?: string[];
  businessName?: string;
  businessPaybillNumbers?: string[];

  referredByStaff?: boolean;
  referralStaffPfNumber?: string;
  referralStaffName?: string;

  nextOfKinName?: string;
  nextOfKinRelationship?: string;
  nextOfKinMobileNumber?: string;

  idOcrCompleted?: boolean;
  idOcrMatchesEnteredData?: boolean;
  idOcrExtractedData?: {
    rawText?: string;
    idNumber?: string;
    fullNameGuess?: string;
    dateOfBirth?: string;
    dateOfIssue?: string;
    dateOfExpiry?: string;
  };
  iprsVerified?: boolean;
  livenessVerified?: boolean;

  paymentCompleted?: boolean;
  amountPaid?: number;

  cbsCustomerNumber?: string;
  rejectionReason?: string;
}

export interface CatalogResponse {
  accountTypes: { code: string; name: string; description: string }[];
  products: { code: string; name: string; description: string }[];
  services: { code: string; name: string; description: string }[];
  shareValueKes: number;
}
