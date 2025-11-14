/**
 * Integration Tests for Error IPC Handlers
 * Tests error handler IPC endpoints with mocked Electron ipcMain
 */

import { errorHandler, ErrorCategory, ErrorSeverity } from '../electron/main/utils/error-handler';

// Mock Electron ipcMain
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

import { ipcMain } from 'electron';
import { registerErrorHandlers } from '../electron/main/ipc/error-handlers';

describe('Error IPC Handlers Integration', () => {
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Store registered handlers
    mockHandlers = new Map();
    (ipcMain.handle as jest.Mock).mockImplementation((channel, handler) => {
      mockHandlers.set(channel, handler);
    });

    // Clear error logs
    errorHandler.clearLogs();

    // Register handlers
    registerErrorHandlers();
  });

  describe('error:get-recent-errors', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'error:get-recent-errors',
        expect.any(Function)
      );
    });

    test('should retrieve recent errors', async () => {
      // Add test errors
      errorHandler.handle('Error 1', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.AGENT, ErrorSeverity.MEDIUM);
      errorHandler.handle('Error 3', ErrorCategory.STORAGE, ErrorSeverity.HIGH);

      const handler = mockHandlers.get('error:get-recent-errors');
      const result = await handler(null, 10);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.timestamp).toBeDefined();
    });

    test('should respect count limit', async () => {
      for (let i = 0; i < 20; i++) {
        errorHandler.handle(`Error ${i}`, ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
      }

      const handler = mockHandlers.get('error:get-recent-errors');
      const result = await handler(null, 5);

      expect(result.errors.length).toBeLessThanOrEqual(5);
    });

    test('should handle default count', async () => {
      errorHandler.handle('Test error', ErrorCategory.IPC, ErrorSeverity.LOW);

      const handler = mockHandlers.get('error:get-recent-errors');
      const result = await handler(null); // No count parameter

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty error log', async () => {
      const handler = mockHandlers.get('error:get-recent-errors');
      const result = await handler(null, 10);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should handle retrieval error gracefully', async () => {
      const handler = mockHandlers.get('error:get-recent-errors');
      // Pass invalid count (negative)
      const result = await handler(null, -1);

      expect(result.success).toBe(true); // Should handle gracefully
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('error:get-errors-by-category', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'error:get-errors-by-category',
        expect.any(Function)
      );
    });

    test('should retrieve errors by category', async () => {
      errorHandler.handle('IPC Error 1', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('IPC Error 2', ErrorCategory.IPC, ErrorSeverity.MEDIUM);
      errorHandler.handle('Agent Error', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      const handler = mockHandlers.get('error:get-errors-by-category');
      const result = await handler(null, ErrorCategory.IPC);

      expect(result.success).toBe(true);
      expect(result.category).toBe(ErrorCategory.IPC);
      expect(result.errors.length).toBe(2);
      expect(result.count).toBe(2);
    });

    test('should return empty array for category with no errors', async () => {
      errorHandler.handle('IPC Error', ErrorCategory.IPC, ErrorSeverity.LOW);

      const handler = mockHandlers.get('error:get-errors-by-category');
      const result = await handler(null, ErrorCategory.AGENT);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('should handle all error categories', async () => {
      const categories = [
        ErrorCategory.IPC,
        ErrorCategory.AGENT,
        ErrorCategory.STORAGE,
        ErrorCategory.CONFIG,
        ErrorCategory.WINDOW,
        ErrorCategory.BROWSER,
        ErrorCategory.NETWORK,
        ErrorCategory.FILE_SYSTEM,
        ErrorCategory.UNKNOWN,
      ];

      categories.forEach(category => {
        errorHandler.handle(`${category} error`, category, ErrorSeverity.LOW);
      });

      const handler = mockHandlers.get('error:get-errors-by-category');

      for (const category of categories) {
        const result = await handler(null, category);
        expect(result.success).toBe(true);
        expect(result.category).toBe(category);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('error:export-report', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'error:export-report',
        expect.any(Function)
      );
    });

    test('should export error report', async () => {
      errorHandler.handle('Error 1', ErrorCategory.AGENT, ErrorSeverity.CRITICAL);
      errorHandler.handle('Error 2', ErrorCategory.AGENT, ErrorSeverity.HIGH);
      errorHandler.handle('Error 3', ErrorCategory.IPC, ErrorSeverity.MEDIUM);

      const handler = mockHandlers.get('error:export-report');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.timestamp).toBeDefined();
      expect(result.report.stats).toBeDefined();
      expect(result.report.errors).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should include correct statistics in report', async () => {
      errorHandler.handle('Error 1', ErrorCategory.AGENT, ErrorSeverity.CRITICAL);
      errorHandler.handle('Error 2', ErrorCategory.IPC, ErrorSeverity.HIGH);

      const handler = mockHandlers.get('error:export-report');
      const result = await handler(null);

      expect(result.report.stats.totalErrors).toBeGreaterThanOrEqual(2);
      expect(result.report.stats.highestSeverity).toBe(ErrorSeverity.CRITICAL);
      expect(result.report.stats.bySeverity).toBeDefined();
    });

    test('should handle export with empty logs', async () => {
      const handler = mockHandlers.get('error:export-report');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.report.stats.totalErrors).toBe(0);
    });
  });

  describe('error:clear-logs', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'error:clear-logs',
        expect.any(Function)
      );
    });

    test('should clear all error logs', async () => {
      errorHandler.handle('Error 1', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.AGENT, ErrorSeverity.MEDIUM);

      expect(errorHandler.getTotalErrorCount()).toBeGreaterThan(0);

      const handler = mockHandlers.get('error:clear-logs');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBeGreaterThan(0);
      expect(result.message).toContain('Cleared');
      expect(errorHandler.getTotalErrorCount()).toBe(0);
    });

    test('should handle clearing empty logs', async () => {
      const handler = mockHandlers.get('error:clear-logs');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.clearedCount).toBe(0);
    });
  });

  describe('error:get-statistics', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'error:get-statistics',
        expect.any(Function)
      );
    });

    test('should retrieve error statistics', async () => {
      errorHandler.handle('Error 1', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.AGENT, ErrorSeverity.MEDIUM);
      errorHandler.handle('Error 3', ErrorCategory.STORAGE, ErrorSeverity.HIGH);

      const handler = mockHandlers.get('error:get-statistics');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalErrors).toBeGreaterThanOrEqual(3);
      expect(result.stats.errorsBySeverity).toBeDefined();
      expect(result.stats.errorsByCategory).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should calculate statistics correctly', async () => {
      errorHandler.handle('Error 1', ErrorCategory.IPC, ErrorSeverity.CRITICAL);
      errorHandler.handle('Error 2', ErrorCategory.IPC, ErrorSeverity.CRITICAL);
      errorHandler.handle('Error 3', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      const handler = mockHandlers.get('error:get-statistics');
      const result = await handler(null);

      expect(result.stats.errorsByCategory[ErrorCategory.IPC]).toBe(2);
      expect(result.stats.errorsByCategory[ErrorCategory.AGENT]).toBe(1);
    });

    test('should handle empty statistics', async () => {
      const handler = mockHandlers.get('error:get-statistics');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.stats.totalErrors).toBe(0);
    });
  });

  describe('error:get-recovery-summary', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'error:get-recovery-summary',
        expect.any(Function)
      );
    });

    test('should retrieve recovery summary for error', async () => {
      const error = errorHandler.handle(
        'Network error',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        {},
        true
      );

      const handler = mockHandlers.get('error:get-recovery-summary');
      const result = await handler(null, error.id);

      expect(result.success).toBe(true);
      expect(result.errorInfo).toBeDefined();
      expect(result.recovery).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should provide recovery strategy for error', async () => {
      const error = errorHandler.handle(
        'Test error',
        ErrorCategory.STORAGE,
        ErrorSeverity.HIGH,
        {},
        true
      );

      const handler = mockHandlers.get('error:get-recovery-summary');
      const result = await handler(null, error.id);

      expect(result.recovery).toBeDefined();
      expect(result.recovery.action).toBeDefined();
    });

    test('should handle non-existent error ID', async () => {
      const handler = mockHandlers.get('error:get-recovery-summary');
      const result = await handler(null, 'non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should return RETRY strategy for recoverable errors', async () => {
      const error = errorHandler.handle(
        'Network timeout',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        {},
        true
      );

      const handler = mockHandlers.get('error:get-recovery-summary');
      const result = await handler(null, error.id);

      expect(result.recovery.action).toBe('RETRY');
    });
  });

  describe('Handler Registration', () => {
    test('should register all 6 error handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledTimes(6);

      const expectedChannels = [
        'error:get-recent-errors',
        'error:get-errors-by-category',
        'error:export-report',
        'error:clear-logs',
        'error:get-statistics',
        'error:get-recovery-summary',
      ];

      expectedChannels.forEach(channel => {
        expect(mockHandlers.has(channel)).toBe(true);
      });
    });

    test('should have all handlers callable', () => {
      mockHandlers.forEach((handler, channel) => {
        expect(typeof handler).toBe('function');
      });
    });
  });

  describe('Error Handler Response Format', () => {
    test('all successful responses should have success flag', async () => {
      errorHandler.handle('Test error', ErrorCategory.IPC, ErrorSeverity.LOW);

      const handlers = [
        { channel: 'error:get-recent-errors', args: [10] },
        { channel: 'error:get-errors-by-category', args: [ErrorCategory.IPC] },
        { channel: 'error:export-report', args: [] },
        { channel: 'error:get-statistics', args: [] },
      ];

      for (const { channel, args } of handlers) {
        const handler = mockHandlers.get(channel);
        const result = await handler(null, ...args);
        expect(result).toHaveProperty('success');
        expect(result.success).toBe(true);
      }
    });

    test('all responses should include timestamp', async () => {
      errorHandler.handle('Test error', ErrorCategory.IPC, ErrorSeverity.LOW);

      const handlers = [
        { channel: 'error:get-recent-errors', args: [10] },
        { channel: 'error:get-errors-by-category', args: [ErrorCategory.IPC] },
        { channel: 'error:export-report', args: [] },
        { channel: 'error:get-statistics', args: [] },
      ];

      for (const { channel, args } of handlers) {
        const handler = mockHandlers.get(channel);
        const result = await handler(null, ...args);
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.timestamp).toBe('number');
      }
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent error retrievals', async () => {
      for (let i = 0; i < 10; i++) {
        errorHandler.handle(`Error ${i}`, ErrorCategory.IPC, ErrorSeverity.LOW);
      }

      const handler = mockHandlers.get('error:get-recent-errors');

      const promises = Array(5)
        .fill(null)
        .map(() => handler(null, 20));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
      });
    });

    test('should handle concurrent statistics retrieval', async () => {
      for (let i = 0; i < 5; i++) {
        errorHandler.handle(`Error ${i}`, ErrorCategory.AGENT, ErrorSeverity.MEDIUM);
      }

      const handler = mockHandlers.get('error:get-statistics');

      const promises = Array(5)
        .fill(null)
        .map(() => handler(null));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.stats.totalErrors).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('Error Handler Callback Integration', () => {
    test('should trigger callbacks when errors occur', () => {
      const callback = jest.fn();
      errorHandler.onError(ErrorCategory.AGENT, callback);

      errorHandler.handle('Agent error', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      expect(callback).toHaveBeenCalled();
    });

    test('should retrieve errors added after callback subscription', async () => {
      const callback = jest.fn();
      errorHandler.onError(ErrorCategory.AGENT, callback);

      errorHandler.handle('Agent error', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      const handler = mockHandlers.get('error:get-recent-errors');
      const result = await handler(null, 10);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(callback).toHaveBeenCalled();
    });
  });
});
