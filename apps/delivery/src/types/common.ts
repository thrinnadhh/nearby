/**
 * Common types shared across the delivery app
 */

export interface AppError {
  code: string;
  message: string;
  statusCode?: number;
}

export class AppErrorClass extends Error implements AppError {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}
