import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptSecret, decryptSecret, isEncrypted } from './encryption.js';

describe('Encryption Vault (AES-256-GCM)', () => {
  const testSecretKey = 'super-secret-key-32-chars-length-safe!';

  it('should successfully encrypt and decrypt plaintext credentials', () => {
    const originalToken = 'xoxb-1234567890-abcdefg-oauth-secret-token';
    const encrypted = encryptSecret(originalToken, testSecretKey);

    assert.notEqual(encrypted, originalToken);
    assert.equal(isEncrypted(encrypted), true);

    const decrypted = decryptSecret(encrypted, testSecretKey);
    assert.equal(decrypted, originalToken);
  });

  it('should fail decryption if payload is corrupted or tampered with', () => {
    const originalToken = 'sensitive-token-123';
    const encrypted = encryptSecret(originalToken, testSecretKey);
    const [iv, authTag, ciphertext] = encrypted.split(':');

    // Tamper with ciphertext
    const tamperedCiphertext = ciphertext.substring(0, ciphertext.length - 2) + '00';
    const tamperedPayload = `${iv}:${authTag}:${tamperedCiphertext}`;

    assert.throws(() => {
      decryptSecret(tamperedPayload, testSecretKey);
    });
  });

  it('should fail decryption if wrong secret key is provided', () => {
    const originalToken = 'sensitive-token-123';
    const encrypted = encryptSecret(originalToken, testSecretKey);
    const wrongKey = 'completely-different-wrong-secret-key!';

    assert.throws(() => {
      decryptSecret(encrypted, wrongKey);
    });
  });
});
