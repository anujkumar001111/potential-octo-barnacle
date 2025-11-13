/**
 * Test Suite: Encryption Utilities
 * Tests the encryption/decryption functionality for secure API key storage
 *
 * WORKTREE CONSOLIDATION REQUIREMENTS - COMPREHENSIVE TESTING
 * ===================================================================
 *
 * UNIT TESTING REQUIREMENTS:
 * TR-ENC-UNIT-001: Test encryptSensitiveData() function with valid inputs
 * TR-ENC-UNIT-002: Test decryptSensitiveData() function with encrypted inputs
 * TR-ENC-UNIT-003: Test isEncryptionAvailable() function detection
 * TR-ENC-UNIT-004: Test fallback to plaintext when encryption unavailable
 * TR-ENC-UNIT-005: Test error handling for encryption failures
 * TR-ENC-UNIT-006: Test error handling for decryption failures
 * TR-ENC-UNIT-007: Test edge cases (empty strings, null values)
 *
 * INTEGRATION TESTING REQUIREMENTS:
 * TR-ENC-INT-001: Test ConfigManager encryption/decryption integration
 * TR-ENC-INT-002: Test API key storage and retrieval flow
 * TR-ENC-INT-003: Test migration from plaintext to encrypted storage
 * TR-ENC-INT-004: Test fallback behavior in development mode
 *
 * SECURITY TESTING REQUIREMENTS:
 * TR-ENC-SEC-001: Test encrypted data format validation
 * TR-ENC-SEC-002: Test plaintext fallback security warnings
 * TR-ENC-SEC-003: Test encrypted data cannot be decrypted without key
 * TR-ENC-SEC-004: Test encryption operations are logged appropriately
 *
 * RELIABILITY TESTING REQUIREMENTS:
 * TR-ENC-REL-001: Test encryption consistency across app restarts
 * TR-ENC-REL-002: Test decryption works across different platforms
 * TR-ENC-REL-003: Test error recovery when encryption fails
 *
 * PERFORMANCE TESTING REQUIREMENTS:
 * TR-ENC-PERF-001: Benchmark encryption/decryption operation speed
 * TR-ENC-PERF-002: Test memory usage during encryption operations
 * TR-ENC-PERF-003: Test concurrent encryption operations
 *
 * COVERAGE REQUIREMENTS:
 * CR-ENC-001: Achieve 95%+ code coverage for encryption utilities
 * CR-ENC-002: Test all error conditions and edge cases
 * CR-ENC-003: Test integration with dependent services
 */

import { encryptSensitiveData, decryptSensitiveData, isEncryptionAvailable } from '../electron/main/utils/encryption';

// Mock electron safeStorage
jest.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: jest.fn(),
    encryptString: jest.fn(),
    decryptString: jest.fn(),
  },
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

import { safeStorage } from 'electron';
import log from 'electron-log';

describe('Encryption Utilities', () => {
  const mockSafeStorage = safeStorage as jest.Mocked<typeof safeStorage>;
  const mockLog = log as jest.Mocked<typeof log>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env.ALLOW_UNENCRYPTED_KEYS;
    delete process.env.NODE_ENV;
  });

  describe('isEncryptionAvailable', () => {
    test('should return true when safeStorage encryption is available', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);

      const result = isEncryptionAvailable();

      expect(result).toBe(true);
      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalledTimes(1);
    });

    test('should return false when safeStorage encryption is unavailable', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const result = isEncryptionAvailable();

      expect(result).toBe(false);
      expect(mockSafeStorage.isEncryptionAvailable).toHaveBeenCalledTimes(1);
    });

    test('should return false and log warning when safeStorage throws', () => {
      mockSafeStorage.isEncryptionAvailable.mockImplementation(() => {
        throw new Error('safeStorage not available');
      });

      const result = isEncryptionAvailable();

      expect(result).toBe(false);
      expect(mockLog.warn).toHaveBeenCalledWith('[Encryption] safeStorage check failed:', expect.any(Error));
    });
  });

  describe('encryptSensitiveData', () => {
    test('should return empty string for empty input', () => {
      const result = encryptSensitiveData('');

      expect(result).toBe('');
    });

    test('should encrypt data when encryption is available', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from('encrypted-data'));

      const result = encryptSensitiveData('secret-api-key');

      expect(result).toBe('ENCRYPTED:ZW5jcnlwdGVkLWRhdGE=');
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('secret-api-key');
      expect(mockLog.info).toHaveBeenCalledWith('[Encryption] Successfully encrypted sensitive data');
    });

    test('should fallback to plaintext in development mode when encryption unavailable', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      process.env.NODE_ENV = 'development';

      const result = encryptSensitiveData('secret-api-key');

      expect(result).toBe('secret-api-key');
      expect(mockLog.warn).toHaveBeenCalledWith('[Encryption] Storing sensitive data as plaintext (encryption unavailable)');
    });

    test('should fallback to plaintext when ALLOW_UNENCRYPTED_KEYS=true', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      process.env.ALLOW_UNENCRYPTED_KEYS = 'true';

      const result = encryptSensitiveData('secret-api-key');

      expect(result).toBe('secret-api-key');
      expect(mockLog.warn).toHaveBeenCalledWith('[Encryption] Storing sensitive data as plaintext (encryption unavailable)');
    });

    test('should throw error when encryption unavailable and fallback not allowed', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      process.env.NODE_ENV = 'production';

      expect(() => encryptSensitiveData('secret-api-key')).toThrow('Failed to encrypt sensitive data');
      expect(mockLog.error).toHaveBeenCalledWith('[Encryption] Failed to encrypt sensitive data:', 'Encryption unavailable and ALLOW_UNENCRYPTED_KEYS not set');
    });

    test('should handle encryption errors gracefully', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      expect(() => encryptSensitiveData('secret-api-key')).toThrow('Failed to encrypt sensitive data');
      expect(mockLog.error).toHaveBeenCalledWith('[Encryption] Failed to encrypt sensitive data:', 'Encryption failed');
    });
  });

  describe('decryptSensitiveData', () => {
    test('should return empty string for empty input', () => {
      const result = decryptSensitiveData('');

      expect(result).toBe('');
    });

    test('should return plaintext data when not encrypted', () => {
      const result = decryptSensitiveData('plain-api-key');

      expect(result).toBe('plain-api-key');
      expect(mockLog.info).toHaveBeenCalledWith('[Encryption] Returning plaintext data (not encrypted)');
    });

    test('should decrypt encrypted data when encryption is available', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.decryptString.mockReturnValue('decrypted-data');

      const encryptedData = 'ENCRYPTED:ZW5jcnlwdGVkLWRhdGE=';
      const result = decryptSensitiveData(encryptedData);

      expect(result).toBe('decrypted-data');
      expect(mockSafeStorage.decryptString).toHaveBeenCalledWith(Buffer.from('encrypted-data'));
      expect(mockLog.info).toHaveBeenCalledWith('[Encryption] Successfully decrypted sensitive data');
    });

    test('should throw error when trying to decrypt without encryption available', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

      const encryptedData = 'ENCRYPTED:ZW5jcnlwdGVkLWRhdGE=';

      expect(() => decryptSensitiveData(encryptedData)).toThrow('Failed to decrypt sensitive data');
      expect(mockLog.error).toHaveBeenCalledWith('[Encryption] Failed to decrypt sensitive data:', 'Encryption unavailable but data appears encrypted');
    });

    test('should handle decryption errors gracefully', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const encryptedData = 'ENCRYPTED:ZW5jcnlwdGVkLWRhdGE=';

      expect(() => decryptSensitiveData(encryptedData)).toThrow('Failed to decrypt sensitive data');
      expect(mockLog.error).toHaveBeenCalledWith('[Encryption] Failed to decrypt sensitive data:', 'Decryption failed');
    });
  });

  describe('End-to-End Encryption Flow', () => {
    test('should encrypt and decrypt data correctly', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from('encrypted-secret'));
      mockSafeStorage.decryptString.mockReturnValue('original-secret');

      const originalData = 'my-api-key-123';
      const encrypted = encryptSensitiveData(originalData);
      const decrypted = decryptSensitiveData(encrypted);

      expect(encrypted).toMatch(/^ENCRYPTED:/);
      expect(decrypted).toBe('original-secret');
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('my-api-key-123');
      expect(mockSafeStorage.decryptString).toHaveBeenCalledWith(Buffer.from('encrypted-secret'));
    });

    test('should handle plaintext fallback end-to-end', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      process.env.ALLOW_UNENCRYPTED_KEYS = 'true';

      const originalData = 'fallback-api-key';
      const encrypted = encryptSensitiveData(originalData);
      const decrypted = decryptSensitiveData(encrypted);

      expect(encrypted).toBe('fallback-api-key');
      expect(decrypted).toBe('fallback-api-key');
    });
  });
});