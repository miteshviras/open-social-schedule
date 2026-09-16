"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const encryption_js_1 = require("./encryption.js");
(0, node_test_1.describe)('Encryption Vault (AES-256-GCM)', () => {
    const testSecretKey = 'super-secret-key-32-chars-length-safe!';
    (0, node_test_1.it)('should successfully encrypt and decrypt plaintext credentials', () => {
        const originalToken = 'xoxb-1234567890-abcdefg-oauth-secret-token';
        const encrypted = (0, encryption_js_1.encryptSecret)(originalToken, testSecretKey);
        strict_1.default.notEqual(encrypted, originalToken);
        strict_1.default.equal((0, encryption_js_1.isEncrypted)(encrypted), true);
        const decrypted = (0, encryption_js_1.decryptSecret)(encrypted, testSecretKey);
        strict_1.default.equal(decrypted, originalToken);
    });
    (0, node_test_1.it)('should fail decryption if payload is corrupted or tampered with', () => {
        const originalToken = 'sensitive-token-123';
        const encrypted = (0, encryption_js_1.encryptSecret)(originalToken, testSecretKey);
        const [iv, authTag, ciphertext] = encrypted.split(':');
        // Tamper with ciphertext
        const tamperedCiphertext = ciphertext.substring(0, ciphertext.length - 2) + '00';
        const tamperedPayload = `${iv}:${authTag}:${tamperedCiphertext}`;
        strict_1.default.throws(() => {
            (0, encryption_js_1.decryptSecret)(tamperedPayload, testSecretKey);
        });
    });
    (0, node_test_1.it)('should fail decryption if wrong secret key is provided', () => {
        const originalToken = 'sensitive-token-123';
        const encrypted = (0, encryption_js_1.encryptSecret)(originalToken, testSecretKey);
        const wrongKey = 'completely-different-wrong-secret-key!';
        strict_1.default.throws(() => {
            (0, encryption_js_1.decryptSecret)(encrypted, wrongKey);
        });
    });
});
//# sourceMappingURL=encryption.test.js.map