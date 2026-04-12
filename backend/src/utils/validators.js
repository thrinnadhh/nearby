import Joi from 'joi';

export const SHOP_CATEGORIES = [
  'kirana',
  'vegetable_vendor',
  'pharmacy',
  'restaurant',
  'pet_store',
  'mobile_shop',
  'furniture_store',
];

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
    .valid(...SHOP_CATEGORIES)
    .required()
    .messages({
      'any.only': `Category must be one of: ${SHOP_CATEGORIES.join(', ')}`,
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
    .valid(...SHOP_CATEGORIES)
    .optional()
    .messages({
      'any.only': `Category must be one of: ${SHOP_CATEGORIES.join(', ')}`,
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

export const toggleShopSchema = Joi.object({
  // No required body fields — toggle endpoint accepts empty body
  // Any fields present are silently ignored (immutable state)
}).unknown(true).optional();

// ─── PRODUCT SCHEMAS ──────────────────────────────────────────────────────────
// Multipart form values arrive as strings; Joi coerces with convert:true (default).

export const PRODUCT_CATEGORIES = [
  'grocery',
  'vegetable',
  'fruit',
  'dairy',
  'medicine',
  'personal_care',
  'household',
  'electronics',
  'clothing',
  'food_beverage',
  'pet_supplies',
  'other',
];

export const PRODUCT_UNITS = ['kg', 'gram', 'litre', 'ml', 'piece', 'pack', 'dozen', 'box'];

/**
 * Schema for single product creation (POST /shops/:shopId/products).
 * Multipart form fields arrive as strings — Joi coerces number fields automatically.
 * Decimal prices (e.g. "10.5") will fail the integer() constraint.
 */
export const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 100 characters',
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .required()
    .messages({
      'any.only': `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
    }),
  price: Joi.number()
    .integer()
    .min(1)
    .max(999999900)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.integer': 'Price must be an integer (paise)',
      'number.min': 'Price must be at least 1 paise',
      'number.max': 'Price must not exceed 999999900 paise',
    }),
  stock_quantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'stock_quantity must be a number',
      'number.integer': 'stock_quantity must be an integer',
      'number.min': 'stock_quantity must be 0 or greater',
    }),
  unit: Joi.string()
    .valid(...PRODUCT_UNITS)
    .required()
    .messages({
      'any.only': `Unit must be one of: ${PRODUCT_UNITS.join(', ')}`,
    }),
});

/**
 * Schema for bulk CSV product rows.
 * CSV column price_paise is mapped to price before validation.
 * Same constraints as createProductSchema.
 */
export const bulkProductRowSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 100 characters',
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .required()
    .messages({
      'any.only': `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
    }),
  price: Joi.number()
    .integer()
    .min(1)
    .max(999999900)
    .required()
    .messages({
      'number.base': 'price_paise must be a number',
      'number.integer': 'price_paise must be an integer (paise)',
      'number.min': 'price_paise must be at least 1 paise',
      'number.max': 'price_paise must not exceed 999999900 paise',
    }),
  stock_quantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'stock_quantity must be a number',
      'number.integer': 'stock_quantity must be an integer',
      'number.min': 'stock_quantity must be 0 or greater',
    }),
  unit: Joi.string()
    .valid(...PRODUCT_UNITS)
    .required()
    .messages({
      'any.only': `Unit must be one of: ${PRODUCT_UNITS.join(', ')}`,
    }),
});

export const updateProductSchema = Joi.object({
  price: Joi.number()
    .integer()
    .min(1)
    .max(999999900)
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.integer': 'Price must be an integer (paise)',
      'number.min': 'Price must be at least 1 paise',
      'number.max': 'Price must not exceed 999999900 paise',
    }),
  stock_quantity: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'stock_quantity must be a number',
      'number.integer': 'stock_quantity must be an integer',
      'number.min': 'stock_quantity must be 0 or greater',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

export const productTemplateQuerySchema = Joi.object({
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .optional()
    .messages({
      'any.only': `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
    }),
});

export const searchShopsQuerySchema = Joi.object({
  lat: Joi.number()
    .min(8)
    .max(35)
    .required()
    .messages({
      'number.base': 'lat must be a number',
      'number.min': 'lat must be within India bounds (8-35)',
      'number.max': 'lat must be within India bounds (8-35)',
    }),
  lng: Joi.number()
    .min(68)
    .max(97)
    .required()
    .messages({
      'number.base': 'lng must be a number',
      'number.min': 'lng must be within India bounds (68-97)',
      'number.max': 'lng must be within India bounds (68-97)',
    }),
  radius_km: Joi.number()
    .min(0.1)
    .max(20)
    .default(3)
    .messages({
      'number.base': 'radius_km must be a number',
      'number.min': 'radius_km must be at least 0.1',
      'number.max': 'radius_km must not exceed 20',
    }),
  category: Joi.string()
    .valid(...SHOP_CATEGORIES)
    .optional()
    .messages({
      'any.only': `Category must be one of: ${SHOP_CATEGORIES.join(', ')}`,
    }),
  open_only: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const searchProductsQuerySchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'q is required',
      'string.min': 'q is required',
      'string.max': 'q must not exceed 100 characters',
    }),
  category: Joi.string()
    .valid(...PRODUCT_CATEGORIES)
    .optional()
    .messages({
      'any.only': `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`,
    }),
  shop_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .optional()
    .messages({
      'string.guid': 'shop_id must be a valid UUID',
    }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const ORDER_PAYMENT_METHODS = ['card', 'upi', 'cod'];

export const createOrderSchema = Joi.object({
  shop_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'shop_id must be a valid UUID',
    }),
  payment_method: Joi.string()
    .valid(...ORDER_PAYMENT_METHODS)
    .default('cod')
    .messages({
      'any.only': `payment_method must be one of: ${ORDER_PAYMENT_METHODS.join(', ')}`,
    }),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.string()
          .uuid({ version: 'uuidv4' })
          .required()
          .messages({
            'string.guid': 'product_id must be a valid UUID',
          }),
        qty: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'number.base': 'qty must be a number',
            'number.integer': 'qty must be an integer',
            'number.min': 'qty must be at least 1',
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'items must contain at least one product',
    }),
});

export const partialCancelOrderSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'reason is required',
      'string.min': 'reason must be at least 3 characters',
      'string.max': 'reason must not exceed 200 characters',
    }),
  items: Joi.array()
    .items(
      Joi.object({
        item_id: Joi.string()
          .uuid({ version: 'uuidv4' })
          .required()
          .messages({
            'string.guid': 'item_id must be a valid UUID',
          }),
        cancel_quantity: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'number.base': 'cancel_quantity must be a number',
            'number.integer': 'cancel_quantity must be an integer',
            'number.min': 'cancel_quantity must be at least 1',
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'items must contain at least one order item',
    }),
});

export const initiatePaymentSchema = Joi.object({
  order_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'order_id must be a valid UUID',
    }),
});

// ─── REVIEW SCHEMAS ───────────────────────────────────────────────────────────

export const createReviewSchema = Joi.object({
  order_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'order_id must be a valid UUID',
    }),
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'rating must be a number',
      'number.integer': 'rating must be an integer',
      'number.min': 'rating must be at least 1',
      'number.max': 'rating must not exceed 5',
    }),
  comment: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'comment must not exceed 500 characters',
    }),
});

// ─── DELIVERY OTP SCHEMAS ─────────────────────────────────────────────────────

export const deliveryOtpSchema = Joi.object({
  otp: Joi.string()
    .length(4)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'delivery otp must be 4 digits',
      'string.pattern.base': 'delivery otp must contain only digits',
    }),
});

// ─── DELIVERY RATING SCHEMAS ──────────────────────────────────────────────────

export const deliveryPartnerRatingSchema = Joi.object({
  order_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'order_id must be a valid UUID',
    }),
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'rating must be a number',
      'number.integer': 'rating must be an integer',
      'number.min': 'rating must be at least 1',
      'number.max': 'rating must not exceed 5',
    }),
  comment: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'comment must not exceed 500 characters',
    }),
});

// ─── MESSAGE SCHEMAS ──────────────────────────────────────────────────────────

export const createMessageSchema = Joi.object({
  shop_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'shop_id must be a valid UUID',
    }),
  order_id: Joi.string()
    .uuid({ version: 'uuidv4' })
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'order_id must be a valid UUID if provided',
    }),
  body: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'message body is required',
      'string.min': 'message body must be at least 1 character',
      'string.max': 'message body must not exceed 2000 characters',
    }),
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
