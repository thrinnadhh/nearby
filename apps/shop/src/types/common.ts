/**
 * Common types used throughout the app
 */

export interface HttpError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: HttpError | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class AppError extends Error implements HttpError {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
