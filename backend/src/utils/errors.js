export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const INVALID_OTP               = 'INVALID_OTP';
export const OTP_EXPIRED               = 'OTP_EXPIRED';
export const OTP_LOCKED                = 'OTP_LOCKED';
export const OTP_RATE_LIMITED          = 'OTP_RATE_LIMITED';
export const INVALID_PHONE             = 'INVALID_PHONE';
export const INVALID_TOKEN             = 'INVALID_TOKEN';
export const TOKEN_EXPIRED             = 'TOKEN_EXPIRED';

// ─── SHOP ─────────────────────────────────────────────────────────────────────
export const SHOP_NOT_FOUND            = 'SHOP_NOT_FOUND';
export const SHOP_NOT_VERIFIED         = 'SHOP_NOT_VERIFIED';
export const SHOP_CLOSED               = 'SHOP_CLOSED';
export const SHOP_NOT_OWNER            = 'SHOP_NOT_OWNER';
export const SHOP_SUSPENDED            = 'SHOP_SUSPENDED';

// ─── PRODUCT ──────────────────────────────────────────────────────────────────
export const PRODUCT_NOT_FOUND         = 'PRODUCT_NOT_FOUND';
export const PRODUCT_OUT_OF_STOCK      = 'PRODUCT_OUT_OF_STOCK';
export const INSUFFICIENT_STOCK        = 'INSUFFICIENT_STOCK';

// ─── ORDER ────────────────────────────────────────────────────────────────────
export const ORDER_NOT_FOUND           = 'ORDER_NOT_FOUND';
export const ORDER_NOT_CANCELLABLE     = 'ORDER_NOT_CANCELLABLE';
export const ORDER_ACCEPT_EXPIRED      = 'ORDER_ACCEPT_EXPIRED';
export const DUPLICATE_ORDER           = 'DUPLICATE_ORDER';

// ─── PAYMENT ──────────────────────────────────────────────────────────────────
export const PAYMENT_FAILED            = 'PAYMENT_FAILED';
export const PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED';
export const INVALID_WEBHOOK_SIGNATURE = 'INVALID_WEBHOOK_SIGNATURE';

// ─── DELIVERY ─────────────────────────────────────────────────────────────────
export const NO_PARTNER_AVAILABLE      = 'NO_PARTNER_AVAILABLE';
export const INVALID_DELIVERY_OTP      = 'INVALID_DELIVERY_OTP';
export const PARTNER_NOT_FOUND         = 'PARTNER_NOT_FOUND';

// ─── REVIEW ───────────────────────────────────────────────────────────────────
export const REVIEW_ALREADY_EXISTS     = 'REVIEW_ALREADY_EXISTS';
export const ORDER_NOT_DELIVERED       = 'ORDER_NOT_DELIVERED';

// ─── SYSTEM ───────────────────────────────────────────────────────────────────
export const UNAUTHORIZED              = 'UNAUTHORIZED';
export const FORBIDDEN                 = 'FORBIDDEN';
export const NOT_FOUND                 = 'NOT_FOUND';
export const RATE_LIMITED              = 'RATE_LIMITED';
export const INTERNAL_ERROR            = 'INTERNAL_ERROR';
export const VALIDATION_ERROR          = 'VALIDATION_ERROR';
