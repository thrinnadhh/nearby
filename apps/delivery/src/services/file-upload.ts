/**
 * File upload service
 */

import * as FileSystem from 'expo-file-system';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

const FILE_CONSTRAINTS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  MIN_SIZE: 100 * 1024, // 100 KB
  ALLOWED_TYPES: ['image/jpeg', 'image/png'],
};

interface FileInfo {
  uri: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
}

/**
 * Validate and parse image file
 */
export async function parseImageFile(fileUri: string): Promise<FileInfo> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new AppErrorClass('FILE_NOT_FOUND', 'Selected file does not exist', 400);
    }

    const parts = fileUri.split('/');
    const fileName = parts[parts.length - 1];
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!['.jpg', '.jpeg', '.png'].includes(extension)) {
      throw new AppErrorClass(
        'INVALID_FILE_TYPE',
        'Only JPG and PNG files are supported',
        400
      );
    }

    const fileSizeBytes = fileInfo.size || 0;
    if (fileSizeBytes < FILE_CONSTRAINTS.MIN_SIZE) {
      throw new AppErrorClass(
        'FILE_TOO_SMALL',
        `File must be at least ${FILE_CONSTRAINTS.MIN_SIZE / 1024}KB`,
        400
      );
    }

    if (fileSizeBytes > FILE_CONSTRAINTS.MAX_SIZE) {
      throw new AppErrorClass(
        'FILE_TOO_LARGE',
        `File must not exceed ${FILE_CONSTRAINTS.MAX_SIZE / (1024 * 1024)}MB`,
        400
      );
    }

    const mimeType = ['.jpg', '.jpeg'].includes(extension) ? 'image/jpeg' : 'image/png';

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
    if (error instanceof AppErrorClass) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Failed to read file';
    logger.error('File parsing failed', { error: message });
    throw new AppErrorClass('FILE_PARSE_FAILED', message, 400);
  }
}
