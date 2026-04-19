/**
 * Statement API service for Task 12.9
 */

import { client } from './api';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

/**
 * Fetch statement PDF for a specific month
 * Returns the PDF file as a Blob
 */
export async function getStatementPdf(
  shopId: string,
  month: number,
  year: number
): Promise<Blob> {
  try {
    const response = await client.get<Blob>(
      `/shops/${shopId}/statement/pdf`,
      {
        params: { month, year },
        responseType: 'blob',
      }
    );

    if (!response.data) {
      throw new AppError(
        'PDF_GENERATION_ERROR',
        'Failed to generate PDF'
      );
    }

    logger.info('Statement PDF fetched', {
      shopId,
      month,
      year,
      size: response.data.size,
    });

    return response.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch statement';
    logger.error('Statement PDF fetch error', {
      shopId,
      month,
      year,
      error: message,
    });

    throw new AppError(
      'STATEMENT_FETCH_ERROR',
      message,
      (error as any)?.response?.status
    );
  }
}

/**
 * Validate month/year for statement generation
 */
export function validateMonthYear(month: number, year: number): { valid: boolean; error?: string } {
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 1 and 12' };
  }

  if (year < 2020) {
    return { valid: false, error: 'Year must be 2020 or later' };
  }

  const now = new Date();
  const statementDate = new Date(year, month - 1, 1);
  if (statementDate > now) {
    return { valid: false, error: 'Cannot generate statement for future month' };
  }

  return { valid: true };
}
