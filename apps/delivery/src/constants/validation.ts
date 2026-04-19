/**
 * Validation schemas (Joi)
 */

import Joi from 'joi';

export const phoneSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be 10 digits',
      'any.required': 'Phone is required',
    }),
});

export const otpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\d{10}$/)
    .required(),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'OTP must be 6 digits',
    }),
});

export const aadhaarSchema = Joi.object({
  aadhaarLast4: Joi.string()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Aadhaar last 4 must be digits',
    }),
});

export const bankDetailsSchema = Joi.object({
  bankAccountNumber: Joi.string()
    .pattern(/^\d{9,18}$/)
    .required()
    .messages({
      'string.pattern.base': 'Bank account must be 9-18 digits',
    }),
  bankIFSC: Joi.string()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'IFSC must be 11 characters (e.g., HDFC0001234)',
    }),
  bankAccountName: Joi.string()
    .min(3)
    .max(60)
    .required()
    .messages({
      'string.min': 'Account name must be at least 3 characters',
      'string.max': 'Account name must not exceed 60 characters',
    }),
});
