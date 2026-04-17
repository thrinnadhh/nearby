/**
 * useRegistration — Manage form state across 5 registration screens
 * Persists to AsyncStorage for resume on app restart
 * Clears on successful submission
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ShopRegistrationData,
  ShopCreationResponse,
  ShopKYC,
  KYCStatusResponse,
} from '@/types/shop-registration';
import { Shop } from '@/types/shop';
import { AppError } from '@/types/common';
import {
  createShop,
  updateShopPhoto,
  submitKYCDocuments,
  submitRegistration,
  getKYCStatus,
  getShopProfile,
} from '@/services/registration';
import logger from '@/utils/logger';

const STORAGE_KEY = 'nearby_registration_form';
const SHOP_ID_KEY = 'nearby_current_shop_id';

interface UseRegistrationState {
  formData: ShopRegistrationData;
  shopId: string | null;
  currentStep: number;
  loading: boolean;
  error: string | null;
}

interface UseRegistrationActions {
  setField: <K extends keyof ShopRegistrationData>(
    field: K,
    value: ShopRegistrationData[K]
  ) => void;
  setError: (error: string | null) => void;
  goToStep: (step: number) => void;
  submitProfile: () => Promise<ShopCreationResponse>;
  updatePhoto: (photoUrl: string) => Promise<Shop>;
  submitKYC: (documents: {
    aadhaarUrl: string;
    aadhaarSignedUrl: string;
    gstUrl: string;
    gstSignedUrl: string;
    bankUrl: string;
    bankSignedUrl: string;
  }) => Promise<ShopKYC>;
  submitForReview: () => Promise<Shop>;
  checkKYCStatus: () => Promise<KYCStatusResponse>;
  getShop: () => Promise<Shop>;
  clearForm: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const INITIAL_FORM_DATA: ShopRegistrationData = {
  name: '',
  category: '',
  address: '',
  latitude: 0,
  longitude: 0,
  photoUrl: undefined,
  aadhaarUrl: undefined,
  gstUrl: undefined,
  bankUrl: undefined,
  confirmations: undefined,
};

export function useRegistration(): UseRegistrationState & UseRegistrationActions {
  const [state, setState] = useState<UseRegistrationState>({
    formData: INITIAL_FORM_DATA,
    shopId: null,
    currentStep: 1,
    loading: false,
    error: null,
  });

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Persist to AsyncStorage whenever form changes
  useEffect(() => {
    if (state.shopId) {
      persistFormData();
    }
  }, [state.formData, state.shopId]);

  const persistFormData = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formData: state.formData,
          shopId: state.shopId,
          currentStep: state.currentStep,
        })
      );
      logger.debug('Registration form saved to storage', {
        shopId: state.shopId,
        step: state.currentStep,
      });
    } catch (error) {
      logger.error('Failed to save registration form', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [state.formData, state.shopId, state.currentStep]);

  const loadFromStorage = useCallback(async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      const savedShopId = await AsyncStorage.getItem(SHOP_ID_KEY);

      if (savedData) {
        const { formData, shopId, currentStep } = JSON.parse(savedData);
        setState((prev) => ({
          ...prev,
          formData,
          shopId: shopId || savedShopId,
          currentStep: currentStep || 1,
        }));

        logger.info('Registration form loaded from storage', {
          shopId: shopId || savedShopId,
          step: currentStep || 1,
        });
      }
    } catch (error) {
      logger.error('Failed to load registration form', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const setField = useCallback(
    <K extends keyof ShopRegistrationData>(
      field: K,
      value: ShopRegistrationData[K]
    ) => {
      setState((prev) => ({
        ...prev,
        formData: {
          ...prev.formData,
          [field]: value,
        },
      }));
    },
    []
  );

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  const submitProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await createShop({
        name: state.formData.name,
        category: state.formData.category,
        address: state.formData.address,
        latitude: state.formData.latitude,
        longitude: state.formData.longitude,
      });

      // Save shop ID
      await AsyncStorage.setItem(SHOP_ID_KEY, response.id);

      setState((prev) => ({
        ...prev,
        shopId: response.id,
        currentStep: 2,
        loading: false,
      }));

      logger.info('Profile submitted', { shopId: response.id });
      return response;
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to create shop';

      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));

      throw error;
    }
  }, [state.formData]);

  const updatePhoto = useCallback(
    async (photoUrl: string) => {
      if (!state.shopId) {
        throw new AppError('NO_SHOP_ID', 'Shop ID not found');
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const shop = await updateShopPhoto(state.shopId, photoUrl);

        setField('photoUrl', photoUrl);
        setState((prev) => ({
          ...prev,
          currentStep: 3,
          loading: false,
        }));

        logger.info('Photo updated', { shopId: state.shopId });
        return shop;
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'Photo upload failed';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));

        throw error;
      }
    },
    [state.shopId, setField]
  );

  const submitKYC = useCallback(
    async (documents: {
      aadhaarUrl: string;
      aadhaarSignedUrl: string;
      gstUrl: string;
      gstSignedUrl: string;
      bankUrl: string;
      bankSignedUrl: string;
    }) => {
      if (!state.shopId) {
        throw new AppError('NO_SHOP_ID', 'Shop ID not found');
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const kyc = await submitKYCDocuments(state.shopId, documents);

        setField('aadhaarUrl', documents.aadhaarUrl);
        setField('gstUrl', documents.gstUrl);
        setField('bankUrl', documents.bankUrl);

        setState((prev) => ({
          ...prev,
          currentStep: 4,
          loading: false,
        }));

        logger.info('KYC submitted', { shopId: state.shopId });
        return kyc;
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'KYC submission failed';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));

        throw error;
      }
    },
    [state.shopId, setField]
  );

  const submitForReview = useCallback(async () => {
    if (!state.shopId) {
      throw new AppError('NO_SHOP_ID', 'Shop ID not found');
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const shop = await submitRegistration(state.shopId);

      setState((prev) => ({
        ...prev,
        currentStep: 5,
        loading: false,
      }));

      logger.info('Registration submitted for review', {
        shopId: state.shopId,
      });
      return shop;
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : 'Submission failed';

      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));

      throw error;
    }
  }, [state.shopId]);

  const checkKYCStatus = useCallback(async () => {
    if (!state.shopId) {
      throw new AppError('NO_SHOP_ID', 'Shop ID not found');
    }

    try {
      const status = await getKYCStatus(state.shopId);
      logger.debug('KYC status checked', {
        shopId: state.shopId,
        status: status.status,
      });
      return status;
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Status check failed';
      logger.error('KYC status check failed', { error: message });
      throw error;
    }
  }, [state.shopId]);

  const getShop = useCallback(async () => {
    if (!state.shopId) {
      throw new AppError('NO_SHOP_ID', 'Shop ID not found');
    }

    try {
      const shop = await getShopProfile(state.shopId);
      return shop;
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : 'Profile fetch failed';
      logger.error('Shop profile fetch failed', { error: message });
      throw error;
    }
  }, [state.shopId]);

  const clearForm = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(SHOP_ID_KEY);

      setState({
        formData: INITIAL_FORM_DATA,
        shopId: null,
        currentStep: 1,
        loading: false,
        error: null,
      });

      logger.info('Registration form cleared');
    } catch (error) {
      logger.error('Failed to clear form', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  return {
    formData: state.formData,
    shopId: state.shopId,
    currentStep: state.currentStep,
    loading: state.loading,
    error: state.error,
    setField,
    setError,
    goToStep,
    submitProfile,
    updatePhoto,
    submitKYC,
    submitForReview,
    checkKYCStatus,
    getShop,
    clearForm,
    loadFromStorage,
  };
}
