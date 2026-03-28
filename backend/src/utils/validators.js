import Joi from 'joi';

export const phoneSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({ 'string.pattern.base': 'Invalid Indian mobile number' });

export const otpSchema = Joi.string()
  .length(6)
  .pattern(/^\d+$/)
  .required();

export const paginationSchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const uuidSchema = Joi.string().uuid({ version: 'uuidv4' }).required();

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
