/**
 * Delivery partner registration types (Task 13.2)
 */

export interface KYCDocument {
  aadhaarLast4: string; // 4 digits
  aadhaarImageUrl: string;
  vehiclePhotoUrl: string;
}

export interface BankDetails {
  bankAccountNumber: string; // 9-18 digits
  bankIFSC: string; // 11 characters
  bankAccountName: string;
}

export interface RegistrationStep {
  step: 1 | 2 | 3 | 4 | 5; // Aadhaar, Vehicle, Bank, Review, Success
  completed: boolean;
  data: Partial<KYCDocument & BankDetails>;
}

export interface KYCStatusResponse {
  id: string;
  kyc_status: string;
  message: string;
}
