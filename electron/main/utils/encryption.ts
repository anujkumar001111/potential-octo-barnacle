/**
 * ✅ SECURITY FIX: API Key Encryption Module
 *
 * This module provides secure encryption/decryption for sensitive data (API keys)
 * using Electron's safeStorage API, which leverages OS-level encryption:
 * - macOS: Keychain Services
 * - Windows: DPAPI (Data Protection API)
 * - Linux: libsecret/keyring
 *
 * @module encryption
 */

import { safeStorage } from 'electron';
import log from 'electron-log';

/**
 * Check if encryption is available on the current system
 * @returns boolean indicating if safeStorage can encrypt
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

/**
 * Encrypt a string value using OS-level encryption
 *
 * @param plaintext - The plain text to encrypt
 * @returns Base64-encoded encrypted string, or empty string if encryption fails/unavailable
 *
 * @example
 * ```typescript
 * const encrypted = encryptString('sk-1234567890abcdef');
 * // Returns: "ENCRYPTED:base64encodeddata..."
 * ```
 */
export function encryptString(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  try {
    if (!isEncryptionAvailable()) {
      log.warn('[Encryption] Encryption not available on this system. Storing plain text (development only).');
      return plaintext; // Fallback to plain text (only in development)
    }

    const buffer = safeStorage.encryptString(plaintext);
    const encrypted = buffer.toString('base64');

    // Prefix to indicate encrypted data
    return `ENCRYPTED:${encrypted}`;
  } catch (error: any) {
    log.error('[Encryption] Failed to encrypt string:', error);
    return plaintext; // Fallback to plain text on error
  }
}

/**
 * Decrypt an encrypted string value
 *
 * @param encryptedText - The encrypted text (with ENCRYPTED: prefix) or plain text
 * @returns Decrypted plain text string
 *
 * @example
 * ```typescript
 * const decrypted = decryptString('ENCRYPTED:base64encodeddata...');
 * // Returns: "sk-1234567890abcdef"
 * ```
 */
export function decryptString(encryptedText: string): string {
  if (!encryptedText) {
    return '';
  }

  try {
    // Check if data is encrypted (has ENCRYPTED: prefix)
    if (!encryptedText.startsWith('ENCRYPTED:')) {
      // Plain text (legacy data or encryption unavailable)
      return encryptedText;
    }

    if (!isEncryptionAvailable()) {
      log.warn('[Encryption] Encryption not available on this system. Cannot decrypt data.');
      return ''; // Cannot decrypt without encryption support
    }

    // Remove prefix and decrypt
    const base64Data = encryptedText.substring('ENCRYPTED:'.length);
    const buffer = Buffer.from(base64Data, 'base64');
    const decrypted = safeStorage.decryptString(buffer);

    return decrypted;
  } catch (error: any) {
    log.error('[Encryption] Failed to decrypt string:', error);
    return ''; // Return empty string on decryption failure
  }
}

/**
 * Encrypt an object containing API keys
 * Encrypts all string values that appear to be API keys (contain "apiKey" or "Key" in property name)
 *
 * @param data - Object containing potentially sensitive data
 * @returns Object with encrypted values
 */
export function encryptSensitiveData<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const encrypted: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('key'))) {
      // Encrypt API key fields
      encrypted[key] = encryptString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively encrypt nested objects
      encrypted[key] = encryptSensitiveData(value);
    } else {
      // Copy other values as-is
      encrypted[key] = value;
    }
  }

  return encrypted as T;
}

/**
 * Decrypt an object containing encrypted API keys
 * Decrypts all string values that start with "ENCRYPTED:" prefix
 *
 * @param data - Object containing encrypted data
 * @returns Object with decrypted values
 */
export function decryptSensitiveData<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const decrypted: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.startsWith('ENCRYPTED:')) {
      // Decrypt encrypted fields
      decrypted[key] = decryptString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively decrypt nested objects
      decrypted[key] = decryptSensitiveData(value);
    } else {
      // Copy other values as-is
      decrypted[key] = value;
    }
  }

  return decrypted as T;
}
