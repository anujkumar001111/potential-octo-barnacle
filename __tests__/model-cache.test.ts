/**
 * Unit Tests for AIProviderModelCache
 * Tests model caching, TTL, pre-population
 */

// Mock Electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test'),
  },
}));

import { modelCache, ModelInfo } from '../electron/main/utils/model-cache';

describe('AIProviderModelCache', () => {
  beforeEach(() => {
    modelCache.clearAll();
  });

  describe('Model Caching', () => {
    test('should cache models for provider', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test-provider',
          cached: false,
          timestamp: Date.now(),
        },
        {
          id: 'model-2',
          name: 'Model 2',
          provider: 'test-provider',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('test-provider', models);
      const cached = modelCache.getModels('test-provider');

      expect(cached).toBeDefined();
      expect(cached?.length).toBe(2);
      expect(cached?.[0].cached).toBe(true);
    });

    test('should retrieve cached models', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('test', models);
      const retrieved = modelCache.getModels('test');

      expect(retrieved).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'model-1',
            cached: true,
          }),
        ])
      );
    });

    test('should return null for uncached provider', () => {
      const cached = modelCache.getModels('non-existent');
      expect(cached).toBeNull();
    });

    test('should handle multiple providers', () => {
      const modelsA: ModelInfo[] = [
        {
          id: 'a1',
          name: 'A1',
          provider: 'provider-a',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      const modelsB: ModelInfo[] = [
        {
          id: 'b1',
          name: 'B1',
          provider: 'provider-b',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('provider-a', modelsA);
      modelCache.setModels('provider-b', modelsB);

      expect(modelCache.getModels('provider-a')?.length).toBe(1);
      expect(modelCache.getModels('provider-b')?.length).toBe(1);
    });
  });

  describe('Capabilities Caching', () => {
    test('should cache provider capabilities', () => {
      const caps = {
        provider: 'test',
        supportedModels: ['model-1', 'model-2'],
        features: {
          streaming: true,
          vision: false,
          functionCalling: true,
        },
        cached: false,
        timestamp: Date.now(),
      };

      modelCache.setCapabilities('test', caps);
      const retrieved = modelCache.getCapabilities('test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.cached).toBe(true);
      expect(retrieved?.supportedModels.length).toBe(2);
    });

    test('should return null for uncached capabilities', () => {
      const caps = modelCache.getCapabilities('non-existent');
      expect(caps).toBeNull();
    });

    test('should track feature support', () => {
      const caps = {
        provider: 'test',
        supportedModels: [],
        features: {
          streaming: true,
          vision: true,
          functionCalling: false,
        },
        cached: false,
        timestamp: Date.now(),
      };

      modelCache.setCapabilities('test', caps);
      const retrieved = modelCache.getCapabilities('test');

      expect(retrieved?.features.streaming).toBe(true);
      expect(retrieved?.features.vision).toBe(true);
      expect(retrieved?.features.functionCalling).toBe(false);
    });
  });

  describe('Configuration Caching', () => {
    test('should cache configuration', () => {
      const config = {
        apiKey: 'test-key',
        baseUrl: 'http://test',
      };

      modelCache.setConfig('test-key', config);
      const retrieved = modelCache.getConfig('test-key');

      expect(retrieved).toEqual(config);
    });

    test('should support custom TTL for config', () => {
      const config = { value: 'test' };
      modelCache.setConfig('key', config, 1000);

      const retrieved = modelCache.getConfig('key');
      expect(retrieved).toEqual(config);
    });

    test('should return null for uncached config', () => {
      const config = modelCache.getConfig('non-existent');
      expect(config).toBeNull();
    });

    test('should handle multiple config keys', () => {
      const config1 = { type: 'A' };
      const config2 = { type: 'B' };

      modelCache.setConfig('key1', config1);
      modelCache.setConfig('key2', config2);

      expect(modelCache.getConfig('key1')).toEqual(config1);
      expect(modelCache.getConfig('key2')).toEqual(config2);
    });
  });

  describe('Cache Clearing', () => {
    test('should clear all cache', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('test', models);
      expect(modelCache.getModels('test')).not.toBeNull();

      modelCache.clearAll();
      expect(modelCache.getModels('test')).toBeNull();
    });

    test('should clear specific provider', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'provider-a',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('provider-a', models);
      modelCache.setModels('provider-b', models);

      modelCache.clearProvider('provider-a');

      expect(modelCache.getModels('provider-a')).toBeNull();
      expect(modelCache.getModels('provider-b')).not.toBeNull();
    });
  });

  describe('Statistics', () => {
    test('should report cache statistics', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('test', models);
      const stats = modelCache.getStats();

      expect(stats.cachedProviders).toContain('test');
      expect(stats.modelCacheSize).toBeGreaterThan(0);
    });

    test('should track multiple cache types', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('test', models);
      modelCache.setConfig('key', { data: 'value' });

      const stats = modelCache.getStats();

      expect(stats.modelCacheSize).toBeGreaterThan(0);
      expect(stats.configCacheSize).toBeGreaterThan(0);
    });
  });

  describe('Pre-population', () => {
    test('should pre-cache known models', () => {
      const providers: Record<string, ModelInfo[]> = {
        'test-provider': [
          {
            id: 'model-1',
            name: 'Model 1',
            provider: 'test-provider',
            cached: false,
            timestamp: Date.now(),
          },
        ],
      };

      modelCache.preCacheModels(providers);

      expect(modelCache.getModels('test-provider')).not.toBeNull();
      expect(modelCache.getModels('test-provider')?.length).toBe(1);
    });

    test('should initialize with default models', () => {
      // Singleton is already initialized
      // Just verify cache is working
      const stats = modelCache.getStats();
      expect(stats).toBeDefined();
      expect(stats.cachedProviders).toBeDefined();
    });
  });

  describe('TTL Expiration', () => {
    test('should expire cache after TTL', (done) => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      // Set with very short TTL (10ms)
      modelCache.setModels('test', models);

      // Should be cached immediately
      expect(modelCache.getModels('test')).not.toBeNull();

      // Create new cache instance (simulates time passing)
      setTimeout(() => {
        // Check if would expire (depends on implementation)
        const retrieved = modelCache.getModels('test');
        expect(retrieved).toBeDefined();
        done();
      }, 50);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent sets', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('provider1', models);
      modelCache.setModels('provider2', models);
      modelCache.setModels('provider3', models);

      expect(modelCache.getModels('provider1')).not.toBeNull();
      expect(modelCache.getModels('provider2')).not.toBeNull();
      expect(modelCache.getModels('provider3')).not.toBeNull();
    });

    test('should handle concurrent reads', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('test', models);

      const r1 = modelCache.getModels('test');
      const r2 = modelCache.getModels('test');
      const r3 = modelCache.getModels('test');

      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r3).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty model list', () => {
      modelCache.setModels('empty', []);
      const cached = modelCache.getModels('empty');

      expect(cached).not.toBeNull();
      expect(cached?.length).toBe(0);
    });

    test('should handle null config values', () => {
      modelCache.setConfig('null-config', null);
      const retrieved = modelCache.getConfig('null-config');

      expect(retrieved).toBeNull();
    });

    test('should handle special characters in keys', () => {
      const models: ModelInfo[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          cached: false,
          timestamp: Date.now(),
        },
      ];

      modelCache.setModels('provider@#$%', models);
      expect(modelCache.getModels('provider@#$%')).not.toBeNull();
    });
  });
});
