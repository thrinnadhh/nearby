import Joi from 'joi';

export const phoneSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Indian mobile number (10 digits, starting with 6-9)',
    }),
});

export const verifyOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Indian mobile number (10 digits, starting with 6-9)',
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only digits',
    }),
});

export const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const uuidSchema = Joi.string().uuid({ version: 'uuidv4' }).required();

export const createShopSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Shop name must be at least 3 characters',
      'string.max': 'Shop name must not exceed 100 characters',
    }),
  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 500 characters',
    }),
  latitude: Joi.number()
    .required(),
  longitude: Joi.number()
    .required(),
  category: Joi.string()
    .valid(
      'kirana',
      'vegetable_vendor',
      'pharmacy',
      'restaurant',
      'pet_store',
      'mobile_shop',
      'furniture_store'
    )
    .required()
    .messages({
      'any.only': 'Category must be one of: kirana, vegetable_vendor, pharmacy, restaurant, pet_store, mobile_shop, furniture_store',
    }),
  phone: Joi.string()
    .pattern(/^\+91\d{10}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone must be in format +91XXXXXXXXXX',
    }),
});

export const updateShopSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Shop name must be at least 3 characters',
      'string.max': 'Shop name must not exceed 100 characters',
    }),
  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .optional()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 500 characters',
    }),
  category: Joi.string()
    .valid(
      'kirana',
      'vegetable_vendor',
      'pharmacy',
      'restaurant',
      'pet_store',
      'mobile_shop',
      'furniture_store'
    )
    .optional()
    .messages({
      'any.only': 'Category must be one of: kirana, vegetable_vendor, pharmacy, restaurant, pet_store, mobile_shop, furniture_store',
    }),
  phone: Joi.string()
    .pattern(/^\+91\d{10}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Phone must be in format +91XXXXXXXXXX',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.details.map((d) => d.message),
      },
    });
  }
  req.body = value;
  next();
};
