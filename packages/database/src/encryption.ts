import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

function getEncryptionKey(overrideKey?: string): Buffer {
  const secret = overrideKey || process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      'Missing ENCRYPTION_SECRET environment variable. Tokens cannot be safely encrypted or decrypted.'
    );
  }
  // Derive a deterministic 32-byte key using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive credentials (like OAuth access/refresh tokens) at rest using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plaintext: string, secretKey?: string): string {
  if (!plaintext) {
    return '';
  }

  const key = getEncryptionKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted tokens.
 * Throws if the payload has been tampered with or if the key is incorrect.
 */
export function decryptSecret(encryptedPayload: string, secretKey?: string): string {
  if (!encryptedPayload) {
    return '';
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected <iv>:<authTag>:<ciphertext>.');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Checks if a string matches the encrypted payload format.
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2;
}
