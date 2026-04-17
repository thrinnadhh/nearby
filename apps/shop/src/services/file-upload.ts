/**
 * File upload service — image resizing, validation, and Cloudflare R2 upload
 * All uploads handled server-side to leverage Sharp.js + signed URLs
 */

import axios, { AxiosError } from 'axios';
import { FileSystem } from 'expo-file-system';
import { client } from './api';
import { AppError } from '@/types/common';
import { FileUploadResponse } from '@/types/shop-registration';
import logger from '@/utils/logger';

// File constraints per NearBy requirements
const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  MIN_SIZE: 100 * 1024, // 100 KB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
};

interface FileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
}

/**
 * Parse and validate image/document file from URI
 * Checks file size, type, and readability
 */
export async function parseFile(fileUri: string): Promise<FileInfo> {
  try {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new AppError(
        'FILE_NOT_FOUND',
        'Selected file does not exist',
        400
      );
    }

    // Extract file name and determine MIME type
    const parts = fileUri.split('/');
    const fileName = parts[parts.length - 1];
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new AppError(
        'INVALID_FILE_TYPE',
        `File type not allowed. Supported: JPG, PNG, PDF`,
        400
      );
    }

    // Validate file size
    const fileSizeBytes = fileInfo.size || 0;
    if (fileSizeBytes < FILE_CONSTRAINTS.MIN_SIZE) {
      throw new AppError(
        'FILE_TOO_SMALL',
        `File must be at least ${FILE_CONSTRAINTS.MIN_SIZE / 1024}KB`,
        400
      );
    }

    if (fileSizeBytes > FILE_CONSTRAINTS.MAX_SIZE) {
      throw new AppError(
        'FILE_TOO_LARGE',
        `File must not exceed ${FILE_CONSTRAINTS.MAX_SIZE / (1024 * 1024)}MB`,
        400
      );
    }

    // Determine MIME type
    let mimeType = 'application/octet-stream';
    if (extension === '.pdf') {
      mimeType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(extension)) {
      mimeType = 'image/jpeg';
    } else if (extension === '.png') {
      mimeType = 'image/png';
    }

    logger.info('File validated', {
      fileName,
      size: fileSizeBytes,
      type: mimeType,
    });

    return {
      uri: fileUri,
      name: fileName,
      type: extension,
      size: fileSizeBytes,
      mimeType,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error('File parse failed', { error: message });
    throw new AppError('FILE_PARSE_ERROR', message);
  }
}

/**
 * Upload file to backend which handles R2 upload server-side
 * Backend will resize images via Sharp.js before uploading
 *
 * POST /upload/kyc or /upload/photo endpoint
 * Returns { url, signedUrl, uploadedAt }
 */
export async function uploadFileToR2(
  file: FileInfo,
  bucketType: 'kyc' | 'product',
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse> {
  try {
    // Read file into base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType,
      name: file.name,
    } as any);
    formData.append('bucket', bucketType);
    formData.append('fileName', file.name);

    const endpoint = bucketType === 'kyc' ? '/upload/kyc' : '/upload/photo';

    const { data } = await client.post<FileUploadResponse>(
      endpoint,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(Math.min(progress, 99)); // Never reach 100% until complete
          }
        },
      }
    );

    logger.info('File uploaded to R2', {
      fileName: file.name,
      bucket: bucketType,
      uploadedAt: data.uploadedAt,
    });

    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('File upload failed', { error: message, fileName: file.name });

    if (axios.isAxiosError(error) && error.response?.status === 413) {
      throw new AppError(
        'FILE_TOO_LARGE',
        'File is too large to upload. Max 10MB.',
        413
      );
    }

    throw new AppError('FILE_UPLOAD_FAILED', message);
  }
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: { message?: string } })?.error
        ?.message ||
      error.message ||
      'Upload failed'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}
