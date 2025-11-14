/**
 * Unit Tests for ErrorHandler
 * Tests core error management functionality
 */

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test'),
  },
}));

import { errorHandler, ErrorCategory, ErrorSeverity } from '../electron/main/utils/error-handler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    errorHandler.clearLogs();
  });

  describe('Singleton Pattern', () => {
    test('should provide singleton instance', () => {
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.handle).toBe('function');
    });
  });

  describe('Error Logging', () => {
    test('should generate unique error IDs', () => {
      const error1 = errorHandler.handle(
        'Test error 1',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.LOW
      );
      const error2 = errorHandler.handle(
        'Test error 2',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.LOW
      );

      expect(error1.id).toBeDefined();
      expect(error2.id).toBeDefined();
      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    test('should add errors to log', () => {
      const initialCount = errorHandler.getTotalErrorCount();

      errorHandler.handle('Test error', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);

      expect(errorHandler.getTotalErrorCount()).toBe(initialCount + 1);
    });

    test('should categorize errors correctly', () => {
      const error = errorHandler.handle(
        'IPC error',
        ErrorCategory.IPC,
        ErrorSeverity.HIGH
      );

      expect(error.category).toBe(ErrorCategory.IPC);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    test('should set timestamps', () => {
      const before = Date.now();
      const error = errorHandler.handle('Test', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
      const after = Date.now();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    test('should handle Error objects', () => {
      const testError = new Error('Test error message');
      const errorInfo = errorHandler.handle(
        testError,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM
      );

      expect(errorInfo.message).toBe('Test error message');
      expect(errorInfo.stackTrace).toBeDefined();
    });

    test('should handle string messages', () => {
      const errorInfo = errorHandler.handle(
        'String error',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.LOW
      );

      expect(errorInfo.message).toBe('String error');
      expect(errorInfo.stackTrace).toBeUndefined();
    });

    test('should attach context', () => {
      const context = { userId: 'user-123', taskId: 'task-456' };
      const errorInfo = errorHandler.handle(
        'Error with context',
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        context
      );

      expect(errorInfo.context).toEqual(context);
    });

    test('should mark recoverable errors', () => {
      const recoverable = errorHandler.handle(
        'Recoverable error',
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        {},
        true
      );
      const nonRecoverable = errorHandler.handle(
        'Non-recoverable error',
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        {},
        false
      );

      expect(recoverable.isRecoverable).toBe(true);
      expect(nonRecoverable.isRecoverable).toBe(false);
    });
  });

  describe('Error Categories', () => {
    test('should handle all error categories', () => {
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
        const error = errorHandler.handle('Test', category, ErrorSeverity.LOW);
        expect(error.category).toBe(category);
      });
    });

    test('should count errors by category', () => {
      errorHandler.handle('Error 1', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('Error 3', ErrorCategory.AGENT, ErrorSeverity.LOW);

      const byCategory = errorHandler.getErrorsCountByCategory();
      expect(byCategory[ErrorCategory.IPC]).toBe(2);
      expect(byCategory[ErrorCategory.AGENT]).toBe(1);
    });

    test('should filter errors by category', () => {
      errorHandler.handle('IPC Error 1', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('IPC Error 2', ErrorCategory.IPC, ErrorSeverity.LOW);
      errorHandler.handle('Agent Error', ErrorCategory.AGENT, ErrorSeverity.LOW);

      const ipcErrors = errorHandler.getErrorsByCategory(ErrorCategory.IPC);
      expect(ipcErrors.length).toBe(2);
      expect(ipcErrors.every(e => e.category === ErrorCategory.IPC)).toBe(true);
    });
  });

  describe('Severity Levels', () => {
    test('should handle all severity levels', () => {
      const severities = [
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL,
      ];

      severities.forEach(severity => {
        const error = errorHandler.handle('Test', ErrorCategory.UNKNOWN, severity);
        expect(error.severity).toBe(severity);
      });
    });

    test('should filter errors by severity', () => {
      errorHandler.handle('Error 1', ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL);
      errorHandler.handle('Error 2', ErrorCategory.UNKNOWN, ErrorSeverity.HIGH);
      errorHandler.handle('Error 3', ErrorCategory.UNKNOWN, ErrorSeverity.CRITICAL);

      const criticalErrors = errorHandler.getErrorsBySeverity(ErrorSeverity.CRITICAL);
      expect(criticalErrors.length).toBe(2);
      expect(criticalErrors.every(e => e.severity === ErrorSeverity.CRITICAL)).toBe(true);
    });
  });

  describe('Log Management', () => {
    test('should respect max log size', () => {
      // Add 50 errors
      for (let i = 0; i < 50; i++) {
        errorHandler.handle(`Error ${i}`, ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
      }

      const errors = errorHandler.getRecentErrors(100);
      expect(errors.length).toBeLessThanOrEqual(50);
    });

    test('should get recent errors with limit', () => {
      for (let i = 0; i < 20; i++) {
        errorHandler.handle(`Error ${i}`, ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
      }

      const recent = errorHandler.getRecentErrors(5);
      expect(recent.length).toBe(5);
    });

    test('should clear logs', () => {
      errorHandler.handle('Error 1', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);

      const clearedCount = errorHandler.clearLogs();
      expect(clearedCount).toBe(2);
      expect(errorHandler.getTotalErrorCount()).toBe(0);
    });

    test('should return zero when clearing empty logs', () => {
      const count = errorHandler.clearLogs();
      expect(count).toBe(0);
    });
  });

  describe('Error Retrieval', () => {
    test('should get error by ID', () => {
      const error = errorHandler.handle(
        'Test error',
        ErrorCategory.AGENT,
        ErrorSeverity.HIGH
      );

      const retrieved = errorHandler.getErrorInfo(error.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(error.id);
      expect(retrieved?.message).toBe('Test error');
    });

    test('should return undefined for non-existent error ID', () => {
      const retrieved = errorHandler.getErrorInfo('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    test('should get total error count', () => {
      const initial = errorHandler.getTotalErrorCount();

      errorHandler.handle('Error 1', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.UNKNOWN, ErrorSeverity.LOW);

      const updated = errorHandler.getTotalErrorCount();
      expect(updated).toBe(initial + 2);
    });
  });

  describe('Recovery Strategy', () => {
    test('should return ABORT for non-recoverable errors', () => {
      const error = errorHandler.handle(
        'Non-recoverable',
        ErrorCategory.UNKNOWN,
        ErrorSeverity.HIGH,
        {},
        false
      );

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.action).toBe('ABORT');
    });

    test('should return RETRY for network errors', () => {
      const error = errorHandler.handle(
        'Network error',
        ErrorCategory.NETWORK,
        ErrorSeverity.MEDIUM,
        {},
        true
      );

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.action).toBe('RETRY');
      expect(strategy.delayMs).toBe(1000);
      expect(strategy.maxRetries).toBe(3);
    });

    test('should return RETRY for storage errors', () => {
      const error = errorHandler.handle(
        'Storage error',
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        {},
        true
      );

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.action).toBe('RETRY');
      expect(strategy.delayMs).toBe(500);
      expect(strategy.maxRetries).toBe(2);
    });

    test('should return FALLBACK for agent errors', () => {
      const error = errorHandler.handle(
        'Agent error',
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        {},
        true
      );

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.action).toBe('FALLBACK');
      expect(strategy.fallbackValue).toBeNull();
    });

    test('should return IGNORE for other errors', () => {
      const error = errorHandler.handle(
        'Other error',
        ErrorCategory.IPC,
        ErrorSeverity.LOW,
        {},
        true
      );

      const strategy = errorHandler.getRecoveryStrategy(error);
      expect(strategy.action).toBe('IGNORE');
    });
  });

  describe('Error Callbacks', () => {
    test('should register and trigger callbacks', () => {
      const callback = jest.fn();
      errorHandler.onError(ErrorCategory.AGENT, callback);

      errorHandler.handle('Agent error', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Agent error',
          category: ErrorCategory.AGENT,
        })
      );
    });

    test('should only trigger callbacks for matching category', () => {
      const agentCallback = jest.fn();
      const ipcCallback = jest.fn();

      errorHandler.onError(ErrorCategory.AGENT, agentCallback);
      errorHandler.onError(ErrorCategory.IPC, ipcCallback);

      errorHandler.handle('Agent error', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      expect(agentCallback).toHaveBeenCalledTimes(1);
      expect(ipcCallback).toHaveBeenCalledTimes(0);
    });

    test('should unsubscribe from callbacks', () => {
      const callback = jest.fn();
      errorHandler.onError(ErrorCategory.AGENT, callback);
      errorHandler.offError(ErrorCategory.AGENT, callback);

      errorHandler.handle('Agent error', ErrorCategory.AGENT, ErrorSeverity.HIGH);

      expect(callback).toHaveBeenCalledTimes(0);
    });

    test('should handle callback errors gracefully', () => {
      const badCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      errorHandler.onError(ErrorCategory.AGENT, badCallback);
      errorHandler.onError(ErrorCategory.AGENT, goodCallback);

      // Should not throw
      expect(() => {
        errorHandler.handle('Agent error', ErrorCategory.AGENT, ErrorSeverity.HIGH);
      }).not.toThrow();

      expect(badCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('Error Report Export', () => {
    test('should export comprehensive error report', () => {
      errorHandler.handle('Error 1', ErrorCategory.AGENT, ErrorSeverity.CRITICAL);
      errorHandler.handle('Error 2', ErrorCategory.AGENT, ErrorSeverity.HIGH);
      errorHandler.handle('Error 3', ErrorCategory.IPC, ErrorSeverity.MEDIUM);

      const report = errorHandler.exportErrorReport();

      expect(report.timestamp).toBeDefined();
      expect(report.stats.totalErrors).toBe(3);
      expect(report.stats.highestSeverity).toBe(ErrorSeverity.CRITICAL);
      expect(report.stats.bySeverity.critical).toBe(1);
      expect(report.stats.bySeverity.high).toBe(1);
      expect(report.errors.length).toBe(3);
    });

    test('should calculate most common category', () => {
      errorHandler.handle('Error 1', ErrorCategory.AGENT, ErrorSeverity.LOW);
      errorHandler.handle('Error 2', ErrorCategory.AGENT, ErrorSeverity.LOW);
      errorHandler.handle('Error 3', ErrorCategory.IPC, ErrorSeverity.LOW);

      const report = errorHandler.exportErrorReport();
      expect(report.stats.mostCommonCategory).toBe(ErrorCategory.AGENT);
    });

    test('should include all error details in report', () => {
      const context = { userId: 'test-user' };
      errorHandler.handle('Test error', ErrorCategory.AGENT, ErrorSeverity.HIGH, context);

      const report = errorHandler.exportErrorReport();
      expect(report.errors[0].context).toEqual(context);
      expect(report.errors[0].isRecoverable).toBeDefined();
    });
  });

  describe('Specialized Error Handlers', () => {
    test('should handle IPC errors', () => {
      const error = errorHandler.handleIpcError(
        new Error('IPC failed'),
        'test-handler'
      );

      expect(error.category).toBe(ErrorCategory.IPC);
      expect(error.context?.handler).toBe('test-handler');
    });

    test('should handle agent errors', () => {
      const error = errorHandler.handleAgentError(
        'Task failed',
        'task-123'
      );

      expect(error.category).toBe(ErrorCategory.AGENT);
      expect(error.context?.taskId).toBe('task-123');
      expect(error.isRecoverable).toBe(true);
    });

    test('should handle window errors', () => {
      const error = errorHandler.handleWindowError(
        'Window creation failed',
        'window-456'
      );

      expect(error.category).toBe(ErrorCategory.WINDOW);
      expect(error.context?.windowId).toBe('window-456');
    });

    test('should handle storage errors', () => {
      const error = errorHandler.handleStorageError(
        'Save failed',
        'save-checkpoint'
      );

      expect(error.category).toBe(ErrorCategory.STORAGE);
      expect(error.context?.operation).toBe('save-checkpoint');
      expect(error.isRecoverable).toBe(true);
    });
  });
});
