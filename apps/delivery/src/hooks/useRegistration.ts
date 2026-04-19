/**
 * useRegistration hook — handles multi-step registration flow
 */

import { useState } from 'react';
import { useRegistrationStore } from '@/store/registration';
import { useAuthStore } from '@/store/auth';
import { registerPartner, submitKYC, updateBankDetails } from '@/services/partner';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

export function useRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    currentStep,
    aadhaarLast4,
    aadhaarImageUri,
    vehiclePhotoUri,
    bankAccountNumber,
    bankIFSC,
    bankAccountName,
    setCurrentStep,
    setError: setStoreError,
  } = useRegistrationStore();

  const { userId, partnerId } = useAuthStore();

  const moveToNextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as any);
      setError(null);
    }
  };

  const submitRegistration = async () => {
    if (!partnerId) {
      const msg = 'Partner not found. Please register first.';
      setError(msg);
      logger.error('Submit registration: Partner not found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Submit KYC
      if (aadhaarLast4 && aadhaarImageUri && vehiclePhotoUri) {
        await submitKYC(partnerId, {
          aadhaarLast4,
          aadhaarImageUrl: aadhaarImageUri,
          vehiclePhotoUrl: vehiclePhotoUri,
        });
        logger.info('KYC submitted');
      }

      // Update bank details
      if (bankAccountNumber && bankIFSC && bankAccountName) {
        await updateBankDetails(partnerId, {
          bankAccountNumber,
          bankIFSC,
          bankAccountName,
        });
        logger.info('Bank details submitted');
      }

      setCurrentStep(5);
      logger.info('Registration completed');
    } catch (err) {
      const message = err instanceof AppErrorClass ? err.message : 'Registration failed';
      setError(message);
      setStoreError(message);
      logger.error('Registration submission failed', { error: message });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentStep,
    isLoading,
    error,
    moveToNextStep,
    submitRegistration,
    aadhaarLast4,
    aadhaarImageUri,
    vehiclePhotoUri,
    bankAccountNumber,
    bankIFSC,
    bankAccountName,
  };
}
