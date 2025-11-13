/**
 * WORKTREE CONSOLIDATION REQUIREMENTS - SECURITY ENHANCEMENTS
 * ===================================================================
 *
 * FUNCTIONAL REQUIREMENTS:
 * FR-SEC-001: Implement encryptSensitiveData() function for API key encryption
 * FR-SEC-002: Implement decryptSensitiveData() function for secure key retrieval
 * FR-SEC-003: Implement isEncryptionAvailable() function to check Electron safeStorage
 * FR-SEC-004: Support encrypted storage format with "ENCRYPTED:" prefix for base64 data
 * FR-SEC-005: Fallback to plaintext storage in development with ALLOW_UNENCRYPTED_KEYS flag
 *
 * INTEGRATION REQUIREMENTS:
 * IR-SEC-001: ConfigManager shall encrypt all API keys before storage in electron-store
 *   - DeepSeek, Qwen, Google Gemini, Anthropic Claude, OpenRouter API keys
 *   - TTS Region and Key configurations
 *   - MCP tool configurations with sensitive parameters
 *
 * IR-SEC-002: IPC validation middleware shall sanitize all input parameters
 *   - Prevent injection attacks in task messages and configurations
 *   - Validate IPC message structure against Zod schemas
 *   - Rate limit IPC calls to prevent DoS attacks (max 10 calls/second per sender)
 *
 * IR-SEC-003: EkoService shall validate task inputs before AI processing
 *   - Sanitize user-provided task descriptions and parameters
 *   - Prevent prompt injection attacks targeting AI agents
 *   - Validate tool execution parameters before browser automation
 *
 * NON-FUNCTIONAL REQUIREMENTS:
 * NFR-SEC-001: Security - Use Electron safeStorage for OS-level encryption
 * NFR-SEC-002: Reliability - Graceful fallback when encryption unavailable
 * NFR-SEC-003: Performance - Minimal overhead for encryption/decryption operations
 * NFR-SEC-004: Auditability - Log encryption operations for security monitoring
 * NFR-SEC-005: Compatibility - Support both encrypted and unencrypted environments
 *
 * API KEY ENCRYPTION REQUIREMENTS:
 * AKR-SEC-001: API keys shall be encrypted at rest using OS keychain/keystore
 * AKR-SEC-002: API keys shall be decrypted only in memory for immediate use
 * AKR-SEC-003: API keys shall never be logged or exposed in error messages
 * AKR-SEC-004: API keys shall be validated for format before encryption
 * AKR-SEC-005: API key decryption failures shall not crash the application
 *
 * INPUT SANITIZATION REQUIREMENTS:
 * ISR-SEC-001: All user inputs shall be sanitized before processing
 * ISR-SEC-002: HTML/script tags shall be escaped in task descriptions
 * ISR-SEC-003: File paths shall be validated and normalized
 * ISR-SEC-004: URLs shall be validated before browser automation
 * ISR-SEC-005: JSON inputs shall be parsed safely with error handling
 *
 * IPC SECURITY REQUIREMENTS:
 * IPC-SEC-001: All IPC messages shall be validated against Zod schemas
 * IPC-SEC-002: IPC rate limiting shall prevent DoS attacks (1000 sender limit)
 * IPC-SEC-003: IPC sender IDs shall be validated and tracked
 * IPC-SEC-004: IPC fragmentation attacks shall be detected and blocked
 * IPC-SEC-005: IPC error messages shall not leak sensitive information
 *
 * TESTING REQUIREMENTS:
 * TR-SEC-001: Unit tests for encryption/decryption functions
 * TR-SEC-002: Unit tests for input sanitization utilities
 * TR-SEC-003: Unit tests for IPC validation middleware
 * TR-SEC-004: Integration tests for encrypted API key storage/retrieval
 * TR-SEC-005: Security tests for injection attack prevention
 * TR-SEC-006: Performance tests for encryption overhead
 *
 * MIGRATION REQUIREMENTS:
 * MR-SEC-001: Encrypt existing plaintext API keys in electron-store
 * MR-SEC-002: Add input validation to all existing IPC handlers
 * MR-SEC-003: Implement rate limiting for high-frequency IPC calls
 * MR-SEC-004: Add security logging for audit trails
 * MR-SEC-005: Update error messages to prevent information leakage
 *
 * DEPENDENCY REQUIREMENTS:
 * DR-SEC-001: Electron safeStorage API for OS-level encryption
 * DR-SEC-002: Zod schemas for input validation
 * DR-SEC-003: LRU cache for rate limiting state
 * DR-SEC-004: electron-log for security event logging
 */

import { safeStorage } from 'electron';
import log from 'electron-log';

/**
 * Check if encryption is available on this platform
 * Uses Electron's safeStorage API for OS-level encryption
 */
export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch (error) {
    log.warn('[Encryption] safeStorage check failed:', error);
    return false;
  }
}

/**
 * Encrypt sensitive data using OS-level encryption
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with "ENCRYPTED:" prefix, or plaintext in development
 * @throws Error if encryption fails and fallback is not allowed
 */
export function encryptSensitiveData(plaintext: string): string {
  if (!plaintext) return '';

  try {
    if (!isEncryptionAvailable()) {
      // Check environment variable for fallback
      const allowUnencrypted = process.env.ALLOW_UNENCRYPTED_KEYS === 'true';
      const isDev = process.env.NODE_ENV === 'development';

      if (!allowUnencrypted && !isDev) {
        throw new Error('Encryption unavailable and ALLOW_UNENCRYPTED_KEYS not set');
      }

      log.warn('[Encryption] Storing sensitive data as plaintext (encryption unavailable)');
      return plaintext;
    }

    const buffer = safeStorage.encryptString(plaintext);
    const encrypted = `ENCRYPTED:${buffer.toString('base64')}`;

    log.info('[Encryption] Successfully encrypted sensitive data');
    return encrypted;
  } catch (error: any) {
    log.error('[Encryption] Failed to encrypt sensitive data:', error.message);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive data that was encrypted with encryptSensitiveData
 * @param encryptedData - The encrypted data (with or without "ENCRYPTED:" prefix)
 * @returns Decrypted plaintext data
 * @throws Error if decryption fails
 */
export function decryptSensitiveData(encryptedData: string): string {
  if (!encryptedData) return '';

  try {
    // Check if data is encrypted (has prefix)
    if (!encryptedData.startsWith('ENCRYPTED:')) {
      // Assume it's plaintext (development mode or migrated data)
      log.info('[Encryption] Returning plaintext data (not encrypted)');
      return encryptedData;
    }

    if (!isEncryptionAvailable()) {
      throw new Error('Encryption unavailable but data appears encrypted');
    }

    // Remove prefix and decode base64
    const base64Data = encryptedData.slice('ENCRYPTED:'.length);
    const buffer = Buffer.from(base64Data, 'base64');

    const decrypted = safeStorage.decryptString(buffer);
    log.info('[Encryption] Successfully decrypted sensitive data');
    return decrypted;
  } catch (error: any) {
    log.error('[Encryption] Failed to decrypt sensitive data:', error.message);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use encryptSensitiveData instead
 */
export function encryptString(plaintext: string): string {
  log.warn('[Encryption] encryptString is deprecated, use encryptSensitiveData');
  return encryptSensitiveData(plaintext);
}