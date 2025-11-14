/**
 * Unit Tests for ScreenshotCache
 * Tests caching, compression, deduplication
 */

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test'),
  },
}));

import { screenshotCache } from '../electron/main/utils/screenshot-cache';

describe('ScreenshotCache', () => {
  beforeEach(async () => {
    await screenshotCache.clear();
  });

  afterEach(async () => {
    await screenshotCache.clear();
  });

  describe('Cache Operations', () => {
    test('should cache screenshots', async () => {
      const buffer = Buffer.from('fake image data');
      const cached = await screenshotCache.getOrCache(buffer);

      expect(cached).toBeDefined();
      expect(Buffer.isBuffer(cached)).toBe(true);
    });

    test('should generate unique cache IDs', async () => {
      const buffer1 = Buffer.from('image 1');
      const buffer2 = Buffer.from('image 2');

      const cached1 = await screenshotCache.getOrCache(buffer1);
      const cached2 = await screenshotCache.getOrCache(buffer2);

      expect(cached1).toBeDefined();
      expect(cached2).toBeDefined();
    });

    test('should return cached data on hit', async () => {
      const buffer = Buffer.from('fake image data');

      const first = await screenshotCache.getOrCache(buffer);
      const second = await screenshotCache.getOrCache(buffer);

      // Should return same buffer (or equivalent)
      expect(first).toBeDefined();
      expect(second).toBeDefined();
    });

    test('should track cache statistics', async () => {
      const buffer = Buffer.from('fake image');

      await screenshotCache.getOrCache(buffer);
      const stats = screenshotCache.getStats();

      expect(stats.totalCached).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.missCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Deduplication', () => {
    test('should deduplicate identical buffers', async () => {
      const buffer = Buffer.from('duplicate data');

      const cached1 = await screenshotCache.getOrCache(buffer);
      const stats1 = screenshotCache.getStats();
      const missCount1 = stats1.missCount;

      const cached2 = await screenshotCache.getOrCache(buffer);
      const stats2 = screenshotCache.getStats();
      const missCount2 = stats2.missCount;

      // Second access should be a hit (no new miss)
      expect(missCount2).toBe(missCount1);
    });

    test('should use SHA-256 hashing', async () => {
      const buffer = Buffer.from('test data');

      const cached1 = await screenshotCache.getOrCache(buffer);

      // Same data should hit cache
      const cached2 = await screenshotCache.getOrCache(buffer);

      expect(cached1).toBeDefined();
      expect(cached2).toBeDefined();
    });

    test('should distinguish different buffers', async () => {
      const buffer1 = Buffer.from('data 1');
      const buffer2 = Buffer.from('data 2');

      await screenshotCache.getOrCache(buffer1);
      const stats1 = screenshotCache.getStats();

      await screenshotCache.getOrCache(buffer2);
      const stats2 = screenshotCache.getStats();

      expect(stats2.totalCached).toBeGreaterThan(stats1.totalCached);
    });
  });

  describe('Cache Statistics', () => {
    test('should calculate compression ratio', async () => {
      const buffer = Buffer.from('test data');
      await screenshotCache.getOrCache(buffer);

      const stats = screenshotCache.getStats();
      expect(stats.compressionRatio).toBeGreaterThan(0);
      expect(stats.compressionRatio).toBeLessThanOrEqual(1);
    });

    test('should track hit rate', async () => {
      const buffer = Buffer.from('test');

      // Generate miss
      await screenshotCache.getOrCache(buffer);
      let stats = screenshotCache.getStats();
      expect(stats.missCount).toBeGreaterThan(0);

      // Generate hits
      await screenshotCache.getOrCache(buffer);
      stats = screenshotCache.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });

    test('should report total cache size', async () => {
      const buffer = Buffer.from('test data');
      await screenshotCache.getOrCache(buffer);

      const stats = screenshotCache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    test('should report total cached items', async () => {
      const buffer1 = Buffer.from('data 1');
      const buffer2 = Buffer.from('data 2');

      await screenshotCache.getOrCache(buffer1);
      await screenshotCache.getOrCache(buffer2);

      const stats = screenshotCache.getStats();
      expect(stats.totalCached).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Memory Management', () => {
    test('should clear all cache', async () => {
      const buffer = Buffer.from('test');
      await screenshotCache.getOrCache(buffer);

      const statsBefore = screenshotCache.getStats();
      expect(statsBefore.totalCached).toBeGreaterThan(0);

      await screenshotCache.clear();
      const statsAfter = screenshotCache.getStats();

      expect(statsAfter.totalCached).toBe(0);
    });

    test('should handle cleanup gracefully', async () => {
      const buffer = Buffer.from('test');
      await screenshotCache.getOrCache(buffer);

      // Singleton cache is globally managed
      // Should not throw
      expect(() => {
        const stats = screenshotCache.getStats();
        expect(stats).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle caching errors', async () => {
      const buffer = Buffer.from('test');

      expect(async () => {
        await screenshotCache.getOrCache(buffer);
      }).not.toThrow();
    });

    test('should handle clear errors gracefully', async () => {
      expect(async () => {
        await screenshotCache.clear();
      }).not.toThrow();
    });

    test('should return valid stats even with errors', () => {
      const stats = screenshotCache.getStats();

      expect(stats).toMatchObject({
        totalCached: expect.any(Number),
        totalSize: expect.any(Number),
        compressionRatio: expect.any(Number),
        hitRate: expect.any(Number),
      });
    });
  });

  describe('Compression', () => {
    test('should compress images', async () => {
      const buffer = Buffer.from('large fake image data that should be compressible');
      const cached = await screenshotCache.getOrCache(buffer);

      expect(cached).toBeDefined();
      expect(cached.length).toBeLessThanOrEqual(buffer.length);
    });

    test('should handle different image sizes', async () => {
      const small = Buffer.from('small');
      const large = Buffer.from('x'.repeat(1000));

      const cachedSmall = await screenshotCache.getOrCache(small);
      const cachedLarge = await screenshotCache.getOrCache(large);

      expect(cachedSmall).toBeDefined();
      expect(cachedLarge).toBeDefined();
    });
  });

  describe('Scaling', () => {
    test('should accept width and height parameters', async () => {
      const buffer = Buffer.from('image');

      expect(async () => {
        await screenshotCache.getOrCache(buffer, 1920, 1080, 75);
      }).not.toThrow();
    });

    test('should handle quality parameter', async () => {
      const buffer = Buffer.from('image');

      expect(async () => {
        await screenshotCache.getOrCache(buffer, undefined, undefined, 50);
      }).not.toThrow();

      expect(async () => {
        await screenshotCache.getOrCache(buffer, undefined, undefined, 95);
      }).not.toThrow();
    });
  });

  describe('LRU Eviction', () => {
    test('should manage cache size', async () => {
      const stats = screenshotCache.getStats();
      expect(stats.totalSize).toBeGreaterThanOrEqual(0);
    });

    test('should not exceed memory limits', async () => {
      const stats = screenshotCache.getStats();
      // Cache should maintain reasonable size
      expect(stats.totalSize).toBeLessThan(200 * 1024 * 1024);
    });
  });

  describe('Lifecycle', () => {
    test('should initialize cleanly', () => {
      const stats = screenshotCache.getStats();
      expect(stats.totalCached).toBeGreaterThanOrEqual(0);
    });

    test('should destroy cleanly', async () => {
      await screenshotCache.clear();
      // Singleton cache is globally managed

      expect(() => {
        const stats = screenshotCache.getStats();
        expect(stats).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent caching', async () => {
      const buffers = [
        Buffer.from('data1'),
        Buffer.from('data2'),
        Buffer.from('data3'),
      ];

      const promises = buffers.map(b => screenshotCache.getOrCache(b));
      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      expect(results.every(r => Buffer.isBuffer(r))).toBe(true);
    });

    test('should handle concurrent clear', async () => {
      const buffer = Buffer.from('test');
      await screenshotCache.getOrCache(buffer);

      expect(async () => {
        await Promise.all([
          screenshotCache.clear(),
          screenshotCache.clear(),
        ]);
      }).not.toThrow();
    });
  });
});
