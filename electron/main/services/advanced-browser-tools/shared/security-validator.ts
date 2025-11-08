/**
 * Security validation utilities for Advanced Browser Tools
 * 
 * Validates user input to prevent security vulnerabilities like code injection,
 * XSS attacks, and other malicious patterns.
 */

import { AdvancedToolError, AdvancedToolErrorCode } from './error-codes';

export class SecurityValidator {
  /**
   * Dangerous JavaScript patterns that should be blocked
   */
  private static readonly DANGEROUS_PATTERNS = [
    { pattern: /eval\s*\(/i, name: 'eval()' },
    { pattern: /Function\s*\(/i, name: 'Function constructor' },
    { pattern: /setTimeout\s*\(\s*["'`]/i, name: 'setTimeout with string' },
    { pattern: /setInterval\s*\(\s*["'`]/i, name: 'setInterval with string' },
    { pattern: /<script/i, name: 'script tag' },
    { pattern: /javascript:/i, name: 'javascript: protocol' },
    { pattern: /on\w+\s*=/i, name: 'inline event handler' },
    { pattern: /document\.write/i, name: 'document.write' },
    { pattern: /\.innerHTML\s*=/i, name: 'innerHTML assignment' },
    { pattern: /import\s*\(/i, name: 'dynamic import' }
  ];

  /**
   * Validate JavaScript code for dangerous patterns
   * 
   * @param code - JavaScript code to validate
   * @param allowDynamic - Whether to allow dynamic code execution patterns
   * @throws {AdvancedToolError} If dangerous pattern is detected
   */
  static validateJavaScriptCode(code: string, allowDynamic: boolean = false): void {
    if (!code || typeof code !== 'string') {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_PARAMETERS,
        'Code must be a non-empty string'
      );
    }

    // Check for dangerous patterns
    for (const { pattern, name } of this.DANGEROUS_PATTERNS) {
      // Skip some patterns if dynamic execution is allowed
      if (allowDynamic && (name === 'eval()' || name === 'Function constructor')) {
        continue;
      }

      if (pattern.test(code)) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.DANGEROUS_PATTERN_DETECTED,
          `Dangerous pattern detected: ${name}`,
          { pattern: name, code: code.substring(0, 100) }
        );
      }
    }
  }

  /**
   * Validate CSS selector
   * 
   * @param selector - CSS selector to validate
   * @throws {AdvancedToolError} If selector is invalid
   */
  static validateSelector(selector: string): void {
    if (!selector || typeof selector !== 'string') {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_SELECTOR,
        'Selector must be a non-empty string'
      );
    }

    if (selector.trim().length === 0) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_SELECTOR,
        'Selector cannot be empty or whitespace only'
      );
    }

    if (selector.length > 1000) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_SELECTOR,
        'Selector too long (max 1000 characters)',
        { length: selector.length }
      );
    }

    // Check for potentially malicious patterns in selector
    if (/<script/i.test(selector) || /javascript:/i.test(selector)) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.SECURITY_VIOLATION,
        'Selector contains potentially malicious content'
      );
    }
  }

  /**
   * Validate function path (e.g., "window.myFunction", "document.getElementById")
   * 
   * @param path - Function path to validate
   * @throws {AdvancedToolError} If function path is invalid
   */
  static validateFunctionPath(path: string): void {
    if (!path || typeof path !== 'string') {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_FUNCTION_PATH,
        'Function path must be a non-empty string'
      );
    }

    // Allow alphanumeric characters, underscores, dots, and brackets for array access
    if (!/^[\w.[\]]+$/.test(path)) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_FUNCTION_PATH,
        'Function path must contain only alphanumeric characters, underscores, dots, and brackets',
        { path }
      );
    }

    if (path.length > 500) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_FUNCTION_PATH,
        'Function path too long (max 500 characters)',
        { length: path.length }
      );
    }
  }

  /**
   * Validate CDP command format
   * 
   * @param command - CDP command to validate (e.g., "Page.navigate", "DOM.getDocument")
   * @throws {AdvancedToolError} If command format is invalid
   */
  static validateCDPCommand(command: string): void {
    if (!command || typeof command !== 'string') {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.CDP_INVALID_COMMAND,
        'CDP command must be a non-empty string'
      );
    }

    // CDP commands must be in format "Domain.method"
    if (!/^[A-Z][a-zA-Z]+\.[a-z][a-zA-Z]+$/.test(command)) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.CDP_INVALID_COMMAND,
        'CDP command must be in format "Domain.method" (e.g., "Page.navigate")',
        { command }
      );
    }
  }

  /**
   * Validate file path for security
   * 
   * @param filepath - File path to validate
   * @throws {AdvancedToolError} If file path is potentially unsafe
   */
  static validateFilePath(filepath: string): void {
    if (!filepath || typeof filepath !== 'string') {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_PARAMETERS,
        'File path must be a non-empty string'
      );
    }

    // Check for path traversal attempts
    if (filepath.includes('..') || filepath.includes('~')) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.SECURITY_VIOLATION,
        'File path contains potentially unsafe characters (.. or ~)',
        { filepath }
      );
    }

    // Check for absolute paths (should use relative paths)
    if (filepath.startsWith('/') || /^[A-Z]:/i.test(filepath)) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.SECURITY_VIOLATION,
        'Absolute file paths are not allowed',
        { filepath }
      );
    }
  }

  /**
   * Sanitize string for safe use in JavaScript context
   * 
   * @param str - String to sanitize
   * @returns Sanitized string
   */
  static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return String(str);
    }

    return str
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/'/g, "\\'")     // Escape single quotes
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/`/g, '\\`')     // Escape backticks
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/\t/g, '\\t');   // Escape tabs
  }

  /**
   * Validate timeout value
   * 
   * @param timeout - Timeout in milliseconds
   * @param maxTimeout - Maximum allowed timeout
   * @throws {AdvancedToolError} If timeout is invalid
   */
  static validateTimeout(timeout: number, maxTimeout: number = 60000): void {
    if (typeof timeout !== 'number' || isNaN(timeout)) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_PARAMETERS,
        'Timeout must be a valid number'
      );
    }

    if (timeout < 0) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_PARAMETERS,
        'Timeout cannot be negative'
      );
    }

    if (timeout > maxTimeout) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.INVALID_PARAMETERS,
        `Timeout exceeds maximum allowed value of ${maxTimeout}ms`,
        { timeout, maxTimeout }
      );
    }
  }
}
