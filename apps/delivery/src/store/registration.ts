/**
 * Registration store — manages multi-step registration flow
 */

import { create } from 'zustand';
import { RegistrationStep, KYCDocument, BankDetails } from '@/types/registration';
import logger from '@/utils/logger';

interface RegistrationState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  aadhaarLast4: string;
  aadhaarImageUri: string | null;
  vehiclePhotoUri: string | null;
  bankAccountNumber: string;
  bankIFSC: string;
  bankAccountName: string;
  isSubmitting: boolean;
  error: string | null;
}

interface RegistrationActions {
  setAadhaar: (last4: string, imageUri: string) => void;
  setVehiclePhoto: (imageUri: string) => void;
  setBankDetails: (account: string, ifsc: string, name: string) => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  getKYCDocument: () => Partial<KYCDocument>;
  getBankDetails: () => Partial<BankDetails>;
}

const initialState: RegistrationState = {
  currentStep: 1,
  aadhaarLast4: '',
  aadhaarImageUri: null,
  vehiclePhotoUri: null,
  bankAccountNumber: '',
  bankIFSC: '',
  bankAccountName: '',
  isSubmitting: false,
  error: null,
};

export const useRegistrationStore = create<RegistrationState & RegistrationActions>((set, get) => ({
  ...initialState,

  setAadhaar: (last4, imageUri) => {
    logger.info('Aadhaar set in registration store');
    set({ aadhaarLast4: last4, aadhaarImageUri: imageUri });
  },

  setVehiclePhoto: (imageUri) => {
    logger.info('Vehicle photo set in registration store');
    set({ vehiclePhotoUri: imageUri });
  },

  setBankDetails: (account, ifsc, name) => {
    logger.info('Bank details set in registration store');
    set({
      bankAccountNumber: account,
      bankIFSC: ifsc,
      bankAccountName: name,
    });
  },

  setCurrentStep: (step) => {
    logger.info('Registration step changed', { step });
    set({ currentStep: step });
  },

  setIsSubmitting: (isSubmitting) => {
    set({ isSubmitting });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    logger.info('Registration store reset');
    set(initialState);
  },

  getKYCDocument: () => {
    const state = get();
    return {
      aadhaarLast4: state.aadhaarLast4,
      aadhaarImageUrl: state.aadhaarImageUri || '',
      vehiclePhotoUrl: state.vehiclePhotoUri || '',
    };
  },

  getBankDetails: () => {
    const state = get();
    return {
      bankAccountNumber: state.bankAccountNumber,
      bankIFSC: state.bankIFSC,
      bankAccountName: state.bankAccountName,
    };
  },
}));
