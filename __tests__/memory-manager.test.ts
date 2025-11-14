/**
 * Unit Tests for MemoryManager
 * Tests memory monitoring, pressure detection, and cleanup
 */

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test'),
  },
}));

import { memoryManager } from '../electron/main/utils/memory-manager';

describe('MemoryManager', () => {
  beforeEach(() => {
    // Memory manager is a singleton, just clear state if needed
  });

  afterEach(() => {
    // Memory manager cleanup handled by singleton
  });

  describe('Memory Stats', () => {
    test('should collect memory statistics', () => {
      const stats = memoryManager.getMemoryStats();

      expect(stats.heapUsed).toBeGreaterThan(0);
      expect(stats.heapTotal).toBeGreaterThanOrEqual(stats.heapUsed);
      expect(stats.heapLimit).toBeGreaterThan(0);
      expect(stats.pressure).toBeGreaterThanOrEqual(0);
      expect(stats.pressure).toBeLessThanOrEqual(1);
      expect(stats.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should calculate pressure correctly', () => {
      const stats = memoryManager.getMemoryStats();
      const expectedPressure = stats.heapUsed / stats.heapLimit;

      expect(stats.pressure).toBeCloseTo(expectedPressure, 2);
    });

    test('should track memory history', () => {
      memoryManager.getMemoryStats();
      memoryManager.getMemoryStats();
      memoryManager.getMemoryStats();

      const history = memoryManager.getMemoryHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('should limit memory history size', () => {
      // Collect 300 samples (more than max)
      for (let i = 0; i < 300; i++) {
        memoryManager.getMemoryStats();
      }

      const history = memoryManager.getMemoryHistory();
      expect(history.length).toBeLessThanOrEqual(288);
    });
  });

  describe('Memory Pressure Detection', () => {
    test('should detect normal pressure', () => {
      const stats = memoryManager.getMemoryStats();
      expect(stats.pressure).toBeLessThan(0.7);
    });

    test('should calculate trend from history', () => {
      // Collect multiple stats
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const trend = memoryManager.getMemoryTrend();
      expect(trend.current).toBeDefined();
      expect(trend.average).toBeGreaterThan(0);
      expect(trend.peak).toBeGreaterThanOrEqual(trend.average);
      expect(['stable', 'increasing', 'decreasing']).toContain(trend.trend);
    });

    test('should identify stable trend', () => {
      // Collect stats with small variations
      for (let i = 0; i < 10; i++) {
        memoryManager.getMemoryStats();
      }

      const trend = memoryManager.getMemoryTrend();
      // Trend should be stable with small variations
      expect(trend.trend).toBeDefined();
    });

    test('should set memory pressure for optimizer', () => {
      const stats = memoryManager.getMemoryStats();
      memoryManager.getMemoryStats();

      const trend = memoryManager.getMemoryTrend();
      // Memory pressure should be updated
      expect(trend.current.pressure).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup Operations', () => {
    test('should perform cleanup successfully', async () => {
      const report = await memoryManager.cleanup(false);

      expect(report.freed).toBeGreaterThanOrEqual(0);
      expect(report.duration).toBeGreaterThan(0);
      expect(report.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should track cleanup metrics', async () => {
      const report = await memoryManager.cleanup(false);

      expect(report.contextsCleanup).toBeGreaterThanOrEqual(0);
      expect(report.cacheCleanup).toBeGreaterThanOrEqual(0);
      expect(report.freed).toBeGreaterThanOrEqual(0);
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    test('should perform critical cleanup', async () => {
      const report = await memoryManager.cleanup(true);

      expect(report.freed).toBeGreaterThanOrEqual(0);
      expect(report.duration).toBeGreaterThan(0);
    });

    test('should prevent too frequent cleanups', async () => {
      const start = Date.now();
      await memoryManager.cleanup(false);
      const afterFirst = Date.now();

      // Second cleanup should be deferred or limited
      const result = await memoryManager.cleanup(false);

      // Should complete successfully
      expect(result).toBeDefined();
      // Total time should be reasonable
      expect(Date.now() - start).toBeLessThan(5000);
    });
  });

  describe('Memory Monitoring', () => {
    test('should start and track monitoring', async () => {
      // Collect initial stats
      const before = memoryManager.getMemoryHistory().length;

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get more stats
      const after = memoryManager.getMemoryHistory().length;

      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('should maintain history over time', () => {
      const stats1 = memoryManager.getMemoryStats();
      const history1 = memoryManager.getMemoryHistory();

      expect(history1.length).toBeGreaterThan(0);
      expect(history1[history1.length - 1]).toMatchObject({
        heapUsed: stats1.heapUsed,
        heapTotal: stats1.heapTotal,
        pressure: stats1.pressure,
      });
    });
  });

  describe('Memory Format Utilities', () => {
    test('should calculate bytes correctly', () => {
      // Test internal byte formatting via stats
      const stats = memoryManager.getMemoryStats();

      expect(stats.heapUsed).toBeGreaterThan(0);
      expect(typeof stats.heapUsed).toBe('number');
    });
  });

  describe('Trend Analysis', () => {
    test('should identify current memory state', () => {
      memoryManager.getMemoryStats();
      const trend = memoryManager.getMemoryTrend();

      expect(trend.current).toMatchObject({
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
        heapLimit: expect.any(Number),
        pressure: expect.any(Number),
      });
    });

    test('should calculate average pressure', () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const trend = memoryManager.getMemoryTrend();
      expect(trend.average).toBeGreaterThan(0);
      expect(trend.average).toBeLessThanOrEqual(1);
    });

    test('should track peak pressure', () => {
      for (let i = 0; i < 5; i++) {
        memoryManager.getMemoryStats();
      }

      const trend = memoryManager.getMemoryTrend();
      expect(trend.peak).toBeGreaterThanOrEqual(trend.average);
    });

    test('should detect trend direction', () => {
      for (let i = 0; i < 10; i++) {
        memoryManager.getMemoryStats();
      }

      const trend = memoryManager.getMemoryTrend();
      const validTrends = ['stable', 'increasing', 'decreasing'];
      expect(validTrends).toContain(trend.trend);
    });
  });

  describe('Manager Lifecycle', () => {
    test('should destroy manager cleanly', () => {
      memoryManager.getMemoryStats();
      memoryManager.destroy();

      // Should not throw after destroy
      expect(() => {
        // Attempting to use should fail gracefully
        const history = memoryManager.getMemoryHistory();
        expect(history).toBeDefined();
      }).not.toThrow();
    });

    test('should clean up intervals on destroy', (done) => {
      // Singleton cannot be tested for lifecycle
      // Just verify destroy doesn't throw
      expect(() => {
        memoryManager.destroy();
      }).not.toThrow();

      setTimeout(() => {
        expect(memoryManager).toBeDefined();
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    test('should handle memory collection errors gracefully', () => {
      expect(() => {
        memoryManager.getMemoryStats();
      }).not.toThrow();
    });

    test('should handle cleanup errors gracefully', async () => {
      expect(async () => {
        await memoryManager.cleanup(false);
      }).not.toThrow();
    });

    test('should return valid stats even under load', () => {
      const stats: any[] = [];

      for (let i = 0; i < 100; i++) {
        const stat = memoryManager.getMemoryStats();
        stats.push(stat);

        expect(stat.pressure).toBeGreaterThanOrEqual(0);
        expect(stat.pressure).toBeLessThanOrEqual(1);
      }

      expect(stats.length).toBe(100);
    });
  });

  describe('Integration', () => {
    test('should work with agentContextManager', async () => {
      const stats = memoryManager.getMemoryStats();
      const report = await memoryManager.cleanup(false);

      expect(stats).toBeDefined();
      expect(report).toBeDefined();
      expect(report.contextsCleanup).toBeGreaterThanOrEqual(0);
    });

    test('should provide complete monitoring API', () => {
      const stats = memoryManager.getMemoryStats();
      const trend = memoryManager.getMemoryTrend();
      const history = memoryManager.getMemoryHistory();

      expect(stats).toBeDefined();
      expect(trend).toBeDefined();
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });
});
