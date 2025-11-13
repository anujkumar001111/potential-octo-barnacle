import { config } from "dotenv";
import path from "node:path";
import { app } from "electron";
import fs from "fs";
import { store } from "./store";
// ✅ SECURITY FIX: Import encryption utilities
import { encryptSensitiveData, decryptSensitiveData, isEncryptionAvailable } from "./encryption";
import { SecureString } from './secure-string';

/**
 * WORKTREE CONSOLIDATION REQUIREMENTS - CONFIGURATION SECURITY
 * ===================================================================
 *
 * SECURITY INTEGRATION REQUIREMENTS:
 * IR-CONFIG-001: ConfigManager shall encrypt sensitive data before storage
 *   - API keys (DEEPSEEK_API_KEY, QWEN_API_KEY, GOOGLE_API_KEY, etc.)
 *   - TTS credentials (TTS_REGION, TTS_KEY)
 *   - MCP tool authentication tokens
 *   - Database connection strings (if any)
 *
 * IR-CONFIG-002: ConfigManager shall decrypt sensitive data on retrieval
 *   - Decrypt API keys only when needed for AI service calls
 *   - Keep decrypted keys in memory only for operation duration
 *   - Clear decrypted keys from memory after use
 *
 * IR-CONFIG-003: ConfigManager shall validate encryption availability
 *   - Check Electron safeStorage availability on initialization
 *   - Log warnings when encryption unavailable in production
 *   - Allow unencrypted storage only in development with explicit flag
 *
 * IR-CONFIG-004: ConfigManager shall implement secure key hierarchy
 *   - User UI configuration (highest priority)
 *   - Environment variables (.env.local/.env.production)
 *   - Default embedded values (lowest priority)
 *
 * IR-CONFIG-005: ConfigManager shall prevent key leakage in logs
 *   - Never log decrypted API keys or sensitive values
 *   - Mask sensitive data in debug/error messages
 *   - Use secure string representations for logging
 *
 * PERFORMANCE REQUIREMENTS:
 * PR-CONFIG-001: Cache decrypted keys in memory with TTL (5 minutes)
 * PR-CONFIG-002: Lazy decryption - only decrypt when key is accessed
 * PR-CONFIG-003: Background encryption for configuration updates
 * PR-CONFIG-004: Minimize encryption overhead for frequent config access
 *
 * RELIABILITY REQUIREMENTS:
 * RR-CONFIG-001: Graceful degradation when encryption fails
 * RR-CONFIG-002: Configuration migration for existing unencrypted data
 * RR-CONFIG-003: Atomic configuration updates to prevent corruption
 * RR-CONFIG-004: Configuration backup before encryption migration
 *
 * TESTING REQUIREMENTS:
 * TR-CONFIG-001: Unit tests for encryption/decryption of config values
 * TR-CONFIG-002: Integration tests for secure key hierarchy resolution
 * TR-CONFIG-003: Migration tests for encrypting existing plaintext configs
 * TR-CONFIG-004: Performance tests for configuration access patterns
 * TR-CONFIG-005: Security tests for key leakage prevention
 *
 * MIGRATION REQUIREMENTS:
 * MR-CONFIG-001: Detect and encrypt existing plaintext API keys
 * MR-CONFIG-002: Preserve user configurations during encryption migration
 * MR-CONFIG-003: Add configuration checksums for integrity verification
 * MR-CONFIG-004: Implement rollback capability for failed migrations
 *
 * AUDIT REQUIREMENTS:
 * AR-CONFIG-001: Log configuration access for security monitoring
 * AR-CONFIG-002: Track configuration changes with timestamps
 * AR-CONFIG-003: Audit encryption/decryption operations
 * AR-CONFIG-004: Monitor for suspicious configuration access patterns
 */