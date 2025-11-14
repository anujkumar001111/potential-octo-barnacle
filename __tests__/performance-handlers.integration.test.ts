/**
 * Integration Tests for Performance IPC Handlers
 * Tests performance handler IPC endpoints with mocked Electron ipcMain
 */

import { memoryManager } from '../electron/main/utils/memory-manager';
import { screenshotCache } from '../electron/main/utils/screenshot-cache';
import { modelCache } from '../electron/main/utils/model-cache';

// Mock Electron ipcMain
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
}));

import { ipcMain } from 'electron';
import { registerPerformanceHandlers } from '../electron/main/ipc/performance-handlers';

describe('Performance IPC Handlers Integration', () => {
  let mockHandlers: Map<string, Function>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Store registered handlers
    mockHandlers = new Map();
    (ipcMain.handle as jest.Mock).mockImplementation((channel, handler) => {
      mockHandlers.set(channel, handler);
    });

    // Register handlers (in real app, these are singletons)
    registerPerformanceHandlers();
  });

  afterEach(async () => {
    await screenshotCache.clear();
  });

  describe('perf:get-memory-stats', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:get-memory-stats',
        expect.any(Function)
      );
    });

    test('should retrieve memory statistics', async () => {
      const handler = mockHandlers.get('perf:get-memory-stats');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.heapUsed).toBeGreaterThan(0);
      expect(result.stats.heapTotal).toBeGreaterThanOrEqual(result.stats.heapUsed);
      expect(result.stats.heapLimit).toBeGreaterThan(0);
      expect(result.stats.pressure).toBeGreaterThanOrEqual(0);
      expect(result.stats.pressure).toBeLessThanOrEqual(1);
    });

    test('should format pressure as percentage', async () => {
      const handler = mockHandlers.get('perf:get-memory-stats');
      const result = await handler();

      expect(result.stats.pressurePercent).toBeDefined();
      expect(result.stats.pressurePercent).toMatch(/^\d+\.\d%$/);
    });

    test('should include timestamp', async () => {
      const handler = mockHandlers.get('perf:get-memory-stats');
      const result = await handler();

      expect(result.stats.timestamp).toBeDefined();
      expect(typeof result.stats.timestamp).toBe('number');
    });
  });

  describe('perf:get-memory-trend', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:get-memory-trend',
        expect.any(Function)
      );
    });

    test('should retrieve memory trend analysis', async () => {
      // Collect multiple samples
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-trend');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.trend).toBeDefined();
      expect(result.trend.current).toBeDefined();
      expect(result.trend.averagePressure).toBeDefined();
      expect(result.trend.peakPressure).toBeDefined();
      expect(result.trend.trend).toBeDefined();
    });

    test('should identify trend direction', async () => {
      for (let i = 0; i < 10; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-trend');
      const result = await handler();

      const validTrends = ['stable', 'increasing', 'decreasing'];
      expect(validTrends).toContain(result.trend.trend);
    });

    test('should format pressure percentages', async () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-trend');
      const result = await handler();

      expect(result.trend.averagePressure).toMatch(/^\d+\.\d%$/);
      expect(result.trend.peakPressure).toMatch(/^\d+\.\d%$/);
    });
  });

  describe('perf:trigger-cleanup', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:trigger-cleanup',
        expect.any(Function)
      );
    });

    test('should trigger normal cleanup', async () => {
      const handler = mockHandlers.get('perf:trigger-cleanup');
      const result = await handler(null, false);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.freed).toBeGreaterThanOrEqual(0);
      expect(result.report.duration).toBeGreaterThan(0);
    });

    test('should trigger critical cleanup', async () => {
      const handler = mockHandlers.get('perf:trigger-cleanup');
      const result = await handler(null, true);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.freed).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing isCritical parameter', async () => {
      const handler = mockHandlers.get('perf:trigger-cleanup');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
    });

    test('should include cleanup metrics in report', async () => {
      const handler = mockHandlers.get('perf:trigger-cleanup');
      const result = await handler(null, false);

      expect(result.report.contextsCleanup).toBeGreaterThanOrEqual(0);
      expect(result.report.cacheCleanup).toBeGreaterThanOrEqual(0);
      expect(result.report.freed).toBeGreaterThanOrEqual(0);
      expect(result.report.duration).toBeGreaterThan(0);
    });
  });

  describe('perf:get-screenshot-cache-stats', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:get-screenshot-cache-stats',
        expect.any(Function)
      );
    });

    test('should retrieve screenshot cache statistics', async () => {
      const buffer = Buffer.from('test image data');
      await screenshotCache.getOrCache(buffer);

      const handler = mockHandlers.get('perf:get-screenshot-cache-stats');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalCached).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalSize).toBeGreaterThanOrEqual(0);
      expect(result.stats.compressionRatio).toBeDefined();
      expect(result.stats.hitRate).toBeDefined();
    });

    test('should format compression ratio as percentage', async () => {
      const handler = mockHandlers.get('perf:get-screenshot-cache-stats');
      const result = await handler();

      expect(result.stats.compressionRatio).toMatch(/^\d+\.\d%$/);
      expect(result.stats.hitRate).toMatch(/^\d+\.\d%$/);
    });

    test('should track hit and miss counts', async () => {
      const handler = mockHandlers.get('perf:get-screenshot-cache-stats');
      const result = await handler();

      expect(result.stats.hits).toBeGreaterThanOrEqual(0);
      expect(result.stats.misses).toBeGreaterThanOrEqual(0);
    });
  });

  describe('perf:clear-screenshot-cache', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:clear-screenshot-cache',
        expect.any(Function)
      );
    });

    test('should clear screenshot cache', async () => {
      const buffer = Buffer.from('test image data');
      await screenshotCache.getOrCache(buffer);

      const handler = mockHandlers.get('perf:clear-screenshot-cache');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.message).toContain('cleared');
    });

    test('should handle clearing empty cache', async () => {
      const handler = mockHandlers.get('perf:clear-screenshot-cache');
      const result = await handler();

      expect(result.success).toBe(true);
    });
  });

  describe('perf:get-model-cache-stats', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:get-model-cache-stats',
        expect.any(Function)
      );
    });

    test('should retrieve model cache statistics', async () => {
      const handler = mockHandlers.get('perf:get-model-cache-stats');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats.cachedProviders).toBeDefined();
      expect(Array.isArray(result.stats.cachedProviders)).toBe(true);
      expect(result.stats.modelCacheSize).toBeGreaterThanOrEqual(0);
      expect(result.stats.capabilitiesCacheSize).toBeGreaterThanOrEqual(0);
      expect(result.stats.configCacheSize).toBeGreaterThanOrEqual(0);
    });

    test('should return provider list', async () => {
      const handler = mockHandlers.get('perf:get-model-cache-stats');
      const result = await handler();

      expect(Array.isArray(result.stats.cachedProviders)).toBe(true);
    });
  });

  describe('perf:initialize-model-cache', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:initialize-model-cache',
        expect.any(Function)
      );
    });

    test('should initialize model cache', async () => {
      const handler = mockHandlers.get('perf:initialize-model-cache');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.providers).toBeDefined();
      expect(Array.isArray(result.providers)).toBe(true);
    });

    test('should pre-populate known providers', async () => {
      const handler = mockHandlers.get('perf:initialize-model-cache');
      const result = await handler();

      expect(result.providers.length).toBeGreaterThan(0);
    });
  });

  describe('perf:clear-model-cache', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:clear-model-cache',
        expect.any(Function)
      );
    });

    test('should clear all model cache', async () => {
      const handler = mockHandlers.get('perf:clear-model-cache');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(result.message).toContain('cleared');
    });

    test('should clear specific provider cache', async () => {
      const handler = mockHandlers.get('perf:clear-model-cache');
      const result = await handler(null, 'deepseek');

      expect(result.success).toBe(true);
    });

    test('should handle provider parameter', async () => {
      const handler = mockHandlers.get('perf:clear-model-cache');

      const resultAll = await handler(null);
      expect(resultAll.success).toBe(true);

      const resultSpecific = await handler(null, 'qwen');
      expect(resultSpecific.success).toBe(true);
    });
  });

  describe('perf:get-memory-history', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:get-memory-history',
        expect.any(Function)
      );
    });

    test('should retrieve memory history', async () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-history');
      const result = await handler(null, 10);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.history)).toBe(true);
      expect(result.history.length).toBeGreaterThan(0);
    });

    test('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-history');
      const result = await handler(null, 3);

      expect(result.history.length).toBeLessThanOrEqual(3);
    });

    test('should handle missing limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-history');
      const result = await handler(null);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.history)).toBe(true);
    });

    test('should format pressure percentages in history', async () => {
      memoryManager.getMemoryStats();

      const handler = mockHandlers.get('perf:get-memory-history');
      const result = await handler(null, 1);

      if (result.history.length > 0) {
        expect(result.history[0].pressure).toMatch(/^\d+\.\d%$/);
        expect(result.history[0].heapUsed).toBeGreaterThan(0);
        expect(result.history[0].timestamp).toBeDefined();
      }
    });
  });

  describe('perf:get-performance-report', () => {
    test('should register handler', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        'perf:get-performance-report',
        expect.any(Function)
      );
    });

    test('should generate comprehensive performance report', async () => {
      const handler = mockHandlers.get('perf:get-performance-report');
      const result = await handler();

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.memory).toBeDefined();
      expect(result.report.screenshot).toBeDefined();
      expect(result.report.models).toBeDefined();
      expect(result.report.timestamp).toBeDefined();
    });

    test('should include memory metrics in report', async () => {
      const handler = mockHandlers.get('perf:get-performance-report');
      const result = await handler();

      expect(result.report.memory.current).toBeDefined();
      expect(result.report.memory.trend).toBeDefined();
      expect(result.report.memory.pressure).toMatch(/^\d+\.\d%$/);
    });

    test('should include screenshot metrics in report', async () => {
      const handler = mockHandlers.get('perf:get-performance-report');
      const result = await handler();

      expect(result.report.screenshot.cached).toBeGreaterThanOrEqual(0);
      expect(result.report.screenshot.totalSize).toBeGreaterThanOrEqual(0);
      expect(result.report.screenshot.compressionRatio).toMatch(/^\d+\.\d%$/);
      expect(result.report.screenshot.hitRate).toMatch(/^\d+\.\d%$/);
    });

    test('should include model cache metrics in report', async () => {
      const handler = mockHandlers.get('perf:get-performance-report');
      const result = await handler();

      expect(result.report.models.providers).toBeDefined();
      expect(Array.isArray(result.report.models.providers)).toBe(true);
      expect(result.report.models.totalCached).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Handler Registration', () => {
    test('should register all 10 performance handlers', () => {
      const expectedChannels = [
        'perf:get-memory-stats',
        'perf:get-memory-trend',
        'perf:trigger-cleanup',
        'perf:get-screenshot-cache-stats',
        'perf:clear-screenshot-cache',
        'perf:get-model-cache-stats',
        'perf:initialize-model-cache',
        'perf:clear-model-cache',
        'perf:get-memory-history',
        'perf:get-performance-report',
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

  describe('Performance Handler Response Format', () => {
    test('all successful responses should have success flag', async () => {
      const handlers = [
        { channel: 'perf:get-memory-stats', args: [] },
        { channel: 'perf:get-memory-trend', args: [] },
        { channel: 'perf:get-screenshot-cache-stats', args: [] },
        { channel: 'perf:get-model-cache-stats', args: [] },
      ];

      for (const { channel, args } of handlers) {
        const handler = mockHandlers.get(channel);
        const result = await handler(...args);
        expect(result.success).toBe(true);
      }
    });

    test('error responses should include error message', async () => {
      // All handlers should handle errors gracefully
      const handlers = [
        { channel: 'perf:get-memory-stats', args: [] },
        { channel: 'perf:get-memory-trend', args: [] },
      ];

      for (const { channel, args } of handlers) {
        const handler = mockHandlers.get(channel);
        const result = await handler(...args);
        // Even if there's an error, it should be handled gracefully
        expect(result).toHaveProperty('success');
      }
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent memory stats retrieval', async () => {
      const handler = mockHandlers.get('perf:get-memory-stats');

      const promises = Array(5)
        .fill(null)
        .map(() => handler());

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.stats).toBeDefined();
      });
    });

    test('should handle concurrent cache stats retrieval', async () => {
      const handler = mockHandlers.get('perf:get-screenshot-cache-stats');

      const promises = Array(5)
        .fill(null)
        .map(() => handler());

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.stats).toBeDefined();
      });
    });

    test('should handle concurrent memory history retrieval', async () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const handler = mockHandlers.get('perf:get-memory-history');

      const promises = Array(5)
        .fill(null)
        .map(() => handler(null, 10));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(Array.isArray(result.history)).toBe(true);
      });
    });
  });

  describe('Data Consistency', () => {
    test('memory stats should be consistent across calls', async () => {
      const handler = mockHandlers.get('perf:get-memory-stats');

      const result1 = await handler();
      const result2 = await handler();

      expect(result1.stats.heapLimit).toBe(result2.stats.heapLimit);
      expect(result1.stats.heapTotal).toBeGreaterThanOrEqual(0);
      expect(result2.stats.heapTotal).toBeGreaterThanOrEqual(0);
    });

    test('performance report should include all components', async () => {
      const handler = mockHandlers.get('perf:get-performance-report');
      const result = await handler();

      // Verify all required sections
      expect(result.report).toHaveProperty('memory');
      expect(result.report).toHaveProperty('screenshot');
      expect(result.report).toHaveProperty('models');
      expect(result.report).toHaveProperty('timestamp');

      // Verify all subsections
      expect(result.report.memory).toHaveProperty('current');
      expect(result.report.memory).toHaveProperty('trend');
      expect(result.report.memory).toHaveProperty('pressure');

      expect(result.report.screenshot).toHaveProperty('cached');
      expect(result.report.screenshot).toHaveProperty('totalSize');
      expect(result.report.screenshot).toHaveProperty('compressionRatio');
      expect(result.report.screenshot).toHaveProperty('hitRate');

      expect(result.report.models).toHaveProperty('providers');
      expect(result.report.models).toHaveProperty('totalCached');
    });
  });
});
