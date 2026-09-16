/**
 * Encrypts sensitive credentials (like OAuth access/refresh tokens) at rest using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export declare function encryptSecret(plaintext: string, secretKey?: string): string;
/**
 * Decrypts AES-256-GCM encrypted tokens.
 * Throws if the payload has been tampered with or if the key is incorrect.
 */
export declare function decryptSecret(encryptedPayload: string, secretKey?: string): string;
/**
 * Checks if a string matches the encrypted payload format.
 */
export declare function isEncrypted(value: string): boolean;
//# sourceMappingURL=encryption.d.ts.map