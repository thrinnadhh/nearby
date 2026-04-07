import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger.js';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PRODUCTS_BUCKET = process.env.R2_PRODUCTS_BUCKET || 'nearby-products';
const R2_KYC_BUCKET = process.env.R2_KYC_BUCKET || 'nearby-kyc';

if (!R2_ACCOUNT_ID) {
  throw new Error('R2_ACCOUNT_ID is not configured');
}
if (!R2_ACCESS_KEY_ID) {
  throw new Error('R2_ACCESS_KEY_ID is not configured');
}
if (!R2_SECRET_ACCESS_KEY) {
  throw new Error('R2_SECRET_ACCESS_KEY is not configured');
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

logger.info('Cloudflare R2 client initialized', { accountId: R2_ACCOUNT_ID });

/**
 * Upload file to R2 bucket.
 * @param {string} bucket - Bucket name ('nearby-products' or 'nearby-kyc')
 * @param {string} key - File path in bucket
 * @param {Buffer} body - File content
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Upload result
 */
async function uploadFile(bucket, key, body, metadata = {}) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: metadata.contentType || 'application/octet-stream',
      Metadata: metadata,
    });

    const result = await s3Client.send(command);
    logger.info('File uploaded to R2', { bucket, key, etag: result.ETag });
    return result;
  } catch (err) {
    logger.error('Failed to upload file to R2', { error: err.message, bucket, key });
    throw err;
  }
}

/**
 * Generate signed URL for private bucket access.
 * @param {string} bucket - Bucket name
 * @param {string} key - File path in bucket
 * @param {number} expiresIn - URL expiry in seconds (default: 5 minutes)
 * @returns {Promise<string>} Signed URL
 */
async function getSignedFileUrl(bucket, key, expiresIn = 300) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    logger.debug('Generated signed URL for R2 file', { bucket, key, expiresIn });
    return url;
  } catch (err) {
    logger.error('Failed to generate signed URL', { error: err.message, bucket, key });
    throw err;
  }
}

/**
 * Delete file from R2 bucket.
 * @param {string} bucket - Bucket name
 * @param {string} key - File path in bucket
 * @returns {Promise<void>}
 */
async function deleteFile(bucket, key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    logger.info('File deleted from R2', { bucket, key });
  } catch (err) {
    logger.error('Failed to delete file from R2', { error: err.message, bucket, key });
    throw err;
  }
}

export { s3Client, uploadFile, getSignedFileUrl, deleteFile };
