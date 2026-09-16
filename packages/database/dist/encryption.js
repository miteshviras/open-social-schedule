"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.isEncrypted = isEncrypted;
const node_crypto_1 = __importDefault(require("node:crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
function getEncryptionKey(overrideKey) {
    const secret = overrideKey || process.env.ENCRYPTION_SECRET;
    if (!secret) {
        throw new Error('Missing ENCRYPTION_SECRET environment variable. Tokens cannot be safely encrypted or decrypted.');
    }
    // Derive a deterministic 32-byte key using SHA-256
    return node_crypto_1.default.createHash('sha256').update(secret).digest();
}
/**
 * Encrypts sensitive credentials (like OAuth access/refresh tokens) at rest using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
function encryptSecret(plaintext, secretKey) {
    if (!plaintext) {
        return '';
    }
    const key = getEncryptionKey(secretKey);
    const iv = node_crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, key, iv, {
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
function decryptSecret(encryptedPayload, secretKey) {
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
    const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, key, iv, {
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
function isEncrypted(value) {
    if (!value || typeof value !== 'string')
        return false;
    const parts = value.split(':');
    return parts.length === 3 && parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2;
}
//# sourceMappingURL=encryption.js.map