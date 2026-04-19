/**
 * Integration tests for registration service
 * Coverage: createShop, updateShopPhoto, submitKYCDocuments,
 *           submitRegistration, getKYCStatus, getShopProfile
 */

import axios from 'axios';
import {
  createShop,
  updateShopPhoto,
  submitKYCDocuments,
  submitRegistration,
  getKYCStatus,
  getShopProfile,
} from '@/services/registration';
import { client } from '@/services/api';
import { AppError } from '@/types/common';

jest.mock('@/services/api', () => ({
  client: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/utils/logger');

const SHOP_ID = 'shop-abc-123';

const MOCK_SHOP_CREATION_RESPONSE = {
  id: SHOP_ID,
  name: 'Test Kirana',
  phone: '9876543210',
  status: 'draft',
};

const MOCK_SHOP = {
  id: SHOP_ID,
  name: 'Test Kirana',
  phone: '9876543210',
  status: 'approved',
  isOpen: false,
  trustScore: 0,
};

const MOCK_KYC = {
  id: 'kyc-001',
  shopId: SHOP_ID,
  status: 'pending',
  aadhaarUrl: 'https://r2.example.com/aadhaar.pdf',
  gstUrl: 'https://r2.example.com/gst.pdf',
  bankUrl: 'https://r2.example.com/bank.pdf',
};

const MOCK_KYC_STATUS = {
  status: 'pending',
  shopId: SHOP_ID,
};

describe('registration service — integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
  });

  // ─── createShop ────────────────────────────────────────────────────
  describe('createShop', () => {
    it('creates a shop successfully', async () => {
      (client.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_SHOP_CREATION_RESPONSE },
      });

      const result = await createShop({
        name: 'Test Kirana',
        phone: '9876543210',
        category: 'grocery',
        address: '123 Main St',
        latitude: 17.385,
        longitude: 78.4867,
      });

      expect(result.id).toBe(SHOP_ID);
      expect(client.post).toHaveBeenCalledWith('/shops', expect.any(Object));
    });

    it('throws VALIDATION_ERROR on 400', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: { message: 'Name is required' } },
        },
        message: 'Bad request',
      });

      await expect(
        createShop({ name: '', phone: '9876543210', category: 'grocery', address: '', latitude: 0, longitude: 0 })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('throws SHOP_ALREADY_EXISTS on 409', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 409 },
        message: 'Conflict',
      });

      await expect(
        createShop({ name: 'Test', phone: '9876543210', category: 'grocery', address: 'addr', latitude: 0, longitude: 0 })
      ).rejects.toMatchObject({ code: 'SHOP_ALREADY_EXISTS', statusCode: 409 });
    });

    it('throws SHOP_CREATION_FAILED on generic error', async () => {
      (client.post as jest.Mock).mockRejectedValue(new Error('Server error'));

      await expect(
        createShop({ name: 'Test', phone: '9876543210', category: 'grocery', address: 'addr', latitude: 0, longitude: 0 })
      ).rejects.toMatchObject({ code: 'SHOP_CREATION_FAILED' });
    });
  });

  // ─── updateShopPhoto ───────────────────────────────────────────────
  describe('updateShopPhoto', () => {
    it('updates shop photo URL successfully', async () => {
      (client.patch as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_SHOP },
      });

      const result = await updateShopPhoto(SHOP_ID, 'https://r2.example.com/photo.jpg');

      expect(result.id).toBe(SHOP_ID);
      expect(client.patch).toHaveBeenCalledWith(
        `/shops/${SHOP_ID}`,
        { photoUrl: 'https://r2.example.com/photo.jpg' }
      );
    });

    it('throws SHOP_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(
        updateShopPhoto(SHOP_ID, 'https://r2.example.com/photo.jpg')
      ).rejects.toMatchObject({ code: 'SHOP_NOT_FOUND', statusCode: 404 });
    });

    it('throws PHOTO_UPDATE_FAILED on generic error', async () => {
      (client.patch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        updateShopPhoto(SHOP_ID, 'https://r2.example.com/photo.jpg')
      ).rejects.toMatchObject({ code: 'PHOTO_UPDATE_FAILED' });
    });
  });

  // ─── submitKYCDocuments ────────────────────────────────────────────
  describe('submitKYCDocuments', () => {
    const KYC_DOCS = {
      aadhaarUrl: 'https://r2.example.com/aadhaar.pdf',
      aadhaarSignedUrl: 'https://r2.example.com/aadhaar-signed.pdf',
      gstUrl: 'https://r2.example.com/gst.pdf',
      gstSignedUrl: 'https://r2.example.com/gst-signed.pdf',
      bankUrl: 'https://r2.example.com/bank.pdf',
      bankSignedUrl: 'https://r2.example.com/bank-signed.pdf',
    };

    it('submits KYC documents successfully', async () => {
      (client.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_KYC },
      });

      const result = await submitKYCDocuments(SHOP_ID, KYC_DOCS);

      expect(result.shopId).toBe(SHOP_ID);
      expect(client.post).toHaveBeenCalledWith(
        `/shops/${SHOP_ID}/kyc`,
        expect.any(Object)
      );
    });

    it('throws SHOP_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(
        submitKYCDocuments(SHOP_ID, KYC_DOCS)
      ).rejects.toMatchObject({ code: 'SHOP_NOT_FOUND', statusCode: 404 });
    });

    it('throws INVALID_DOCUMENTS on 422', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 422 },
        message: 'Unprocessable',
      });

      await expect(
        submitKYCDocuments(SHOP_ID, KYC_DOCS)
      ).rejects.toMatchObject({ code: 'INVALID_DOCUMENTS', statusCode: 422 });
    });

    it('throws KYC_SUBMISSION_FAILED on generic error', async () => {
      (client.post as jest.Mock).mockRejectedValue(new Error('Timeout'));

      await expect(
        submitKYCDocuments(SHOP_ID, KYC_DOCS)
      ).rejects.toMatchObject({ code: 'KYC_SUBMISSION_FAILED' });
    });
  });

  // ─── submitRegistration ────────────────────────────────────────────
  describe('submitRegistration', () => {
    it('submits registration for review successfully', async () => {
      (client.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { ...MOCK_SHOP, status: 'under_review' } },
      });

      const result = await submitRegistration(SHOP_ID);

      expect(result).toBeDefined();
      expect(client.post).toHaveBeenCalledWith(
        `/shops/${SHOP_ID}/submit`,
        {}
      );
    });

    it('throws SHOP_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(submitRegistration(SHOP_ID)).rejects.toMatchObject({
        code: 'SHOP_NOT_FOUND',
      });
    });

    it('throws REGISTRATION_ALREADY_SUBMITTED on 409', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 409 },
        message: 'Conflict',
      });

      await expect(submitRegistration(SHOP_ID)).rejects.toMatchObject({
        code: 'REGISTRATION_ALREADY_SUBMITTED',
      });
    });

    it('throws SUBMISSION_FAILED on generic error', async () => {
      (client.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(submitRegistration(SHOP_ID)).rejects.toMatchObject({
        code: 'SUBMISSION_FAILED',
      });
    });
  });

  // ─── getKYCStatus ──────────────────────────────────────────────────
  describe('getKYCStatus', () => {
    it('returns pending KYC status', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_KYC_STATUS },
      });

      const result = await getKYCStatus(SHOP_ID);

      expect(result.status).toBe('pending');
      expect(client.get).toHaveBeenCalledWith(`/shops/${SHOP_ID}/kyc-status`);
    });

    it('returns approved KYC status', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { ...MOCK_KYC_STATUS, status: 'approved' } },
      });

      const result = await getKYCStatus(SHOP_ID);

      expect(result.status).toBe('approved');
    });

    it('throws SHOP_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.get as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(getKYCStatus(SHOP_ID)).rejects.toMatchObject({
        code: 'SHOP_NOT_FOUND',
      });
    });

    it('throws STATUS_FETCH_FAILED on generic error', async () => {
      (client.get as jest.Mock).mockRejectedValue(new Error('Timeout'));

      await expect(getKYCStatus(SHOP_ID)).rejects.toMatchObject({
        code: 'STATUS_FETCH_FAILED',
      });
    });
  });

  // ─── getShopProfile ────────────────────────────────────────────────
  describe('getShopProfile', () => {
    it('fetches shop profile successfully', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_SHOP },
      });

      const result = await getShopProfile(SHOP_ID);

      expect(result.id).toBe(SHOP_ID);
    });

    it('throws SHOP_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.get as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(getShopProfile(SHOP_ID)).rejects.toMatchObject({
        code: 'SHOP_NOT_FOUND',
      });
    });

    it('throws PROFILE_FETCH_FAILED on generic error', async () => {
      (client.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(getShopProfile(SHOP_ID)).rejects.toMatchObject({
        code: 'PROFILE_FETCH_FAILED',
      });
    });
  });
});
