// ADD THIS SCHEMA TO validators.js AFTER productTemplateQuerySchema (line 295)

export const lowStockAlertsQuerySchema = Joi.object({
  threshold: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .default(5)
    .messages({
      'number.base': 'threshold must be a number',
      'number.integer': 'threshold must be an integer',
      'number.min': 'threshold must be at least 1',
      'number.max': 'threshold must not exceed 999',
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit must not exceed 100',
    }),
  sortBy: Joi.string()
    .valid('stock', 'name', 'updated_at')
    .default('stock')
    .messages({
      'any.only': 'sortBy must be one of: stock, name, updated_at',
    }),
});
