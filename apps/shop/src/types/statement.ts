/**
 * Statement types for Task 12.9
 */

export interface StatementGenerateRequest {
  month: number; // 1-12
  year: number; // 2020+
}

export interface StatementResponse {
  pdfUrl: string;
  fileName: string;
  generatedAt: string;
  month: number;
  year: number;
}

export interface StatementState {
  pdfUrl: string | null;
  fileName: string | null;
  loading: boolean;
  error: string | null;
  generatedMonth: number | null;
  generatedYear: number | null;
  isOffline: boolean;
}

export interface MonthYear {
  month: number;
  year: number;
}
