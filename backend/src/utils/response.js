export const successResponse = (data, meta = {}) => ({
  success: true,
  data,
  ...Object.keys(meta).length ? { meta } : {}
});

export const errorResponse = (code, message, details = {}) => ({
  success: false,
  error: { code, message, ...Object.keys(details).length ? { details } : {} }
});
