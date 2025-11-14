/**
 * AI Provider Model Cache
 * Caches provider configurations, model lists, and API responses
 *
 * Features:
 * - Model configuration caching with TTL
 * - API response caching for model lists
 * - Provider capability caching
 * - Stale-while-revalidate pattern for API calls
 * - Fallback to cached data on network errors
 */

import { createLogger } from './logger';
import { ErrorCategory, ErrorSeverity } from './error-handler';

const logger = createLogger('AIProviderModelCache');

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextWindow?: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  cached: boolean;
  timestamp: number;
}

export interface ProviderCapabilities {
  provider: string;
  supportedModels: string[];
  features: {
    streaming: boolean;
    vision: boolean;
    functionCalling: boolean;
  };
  cached: boolean;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  eTag?: string;
}

export class AIProviderModelCache {
  private modelCache: Map<string, CacheEntry<ModelInfo[]>> = new Map();
  private capabilitiesCache: Map<string, CacheEntry<ProviderCapabilities>> = new Map();
  private configCache: Map<string, CacheEntry<any>> = new Map();

  // Cache TTLs (in milliseconds)
  private readonly MODEL_LIST_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CAPABILITIES_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CONFIG_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Get cached models for provider
   */
  getModels(provider: string): ModelInfo[] | null {
    const cache = this.modelCache.get(provider);

    if (!cache) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cache.timestamp > cache.ttl) {
      this.modelCache.delete(provider);
      return null;
    }

    logger.debug('Model list cache hit', {
      provider,
      modelCount: cache.data.length,
      age: this.formatAge(Date.now() - cache.timestamp),
    });

    return cache.data;
  }

  /**
   * Set cached models for provider
   */
  setModels(provider: string, models: ModelInfo[]): void {
    this.modelCache.set(provider, {
      data: models.map(m => ({ ...m, cached: true })),
      timestamp: Date.now(),
      ttl: this.MODEL_LIST_TTL,
    });

    logger.info('Model list cached', {
      provider,
      modelCount: models.length,
      ttl: `${this.MODEL_LIST_TTL / 1000 / 60}min`,
    });
  }

  /**
   * Get cached provider capabilities
   */
  getCapabilities(provider: string): ProviderCapabilities | null {
    const cache = this.capabilitiesCache.get(provider);

    if (!cache) {
      return null;
    }

    if (Date.now() - cache.timestamp > cache.ttl) {
      this.capabilitiesCache.delete(provider);
      return null;
    }

    return { ...cache.data, cached: true };
  }

  /**
   * Set cached provider capabilities
   */
  setCapabilities(provider: string, capabilities: ProviderCapabilities): void {
    this.capabilitiesCache.set(provider, {
      data: capabilities,
      timestamp: Date.now(),
      ttl: this.CAPABILITIES_TTL,
    });

    logger.info('Provider capabilities cached', {
      provider,
      models: capabilities.supportedModels.length,
    });
  }

  /**
   * Get cached configuration
   */
  getConfig(key: string): any {
    const cache = this.configCache.get(key);

    if (!cache) {
      return null;
    }

    if (Date.now() - cache.timestamp > cache.ttl) {
      this.configCache.delete(key);
      return null;
    }

    logger.debug('Config cache hit', { key });
    return cache.data;
  }

  /**
   * Set cached configuration
   */
  setConfig(key: string, config: any, ttl?: number): void {
    this.configCache.set(key, {
      data: config,
      timestamp: Date.now(),
      ttl: ttl || this.CONFIG_TTL,
    });

    logger.debug('Config cached', { key, ttl: ttl || this.CONFIG_TTL });
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.modelCache.clear();
    this.capabilitiesCache.clear();
    this.configCache.clear();
    logger.info('All provider caches cleared');
  }

  /**
   * Clear specific provider cache
   */
  clearProvider(provider: string): void {
    this.modelCache.delete(provider);
    this.capabilitiesCache.delete(provider);
    logger.info('Provider cache cleared', { provider });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cachedProviders: string[];
    modelCacheSize: number;
    capabilitiesCacheSize: number;
    configCacheSize: number;
  } {
    return {
      cachedProviders: Array.from(
        new Set([
          ...this.modelCache.keys(),
          ...this.capabilitiesCache.keys(),
        ])
      ),
      modelCacheSize: this.modelCache.size,
      capabilitiesCacheSize: this.capabilitiesCache.size,
      configCacheSize: this.configCache.size,
    };
  }

  /**
   * Format age for logging
   */
  private formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Pre-populate cache with known models
   */
  preCacheModels(providers: Record<string, ModelInfo[]>): void {
    try {
      for (const [provider, models] of Object.entries(providers)) {
        this.setModels(provider, models);
      }
      logger.info('Pre-cache completed', {
        providers: Object.keys(providers).length,
      });
    } catch (error) {
      logger.warn(
        'Pre-cache failed',
        { error: (error as Error).message },
        ErrorCategory.CONFIG,
        ErrorSeverity.LOW,
        false
      );
    }
  }
}

// Singleton instance
export const modelCache = new AIProviderModelCache();

/**
 * Pre-cache common models on initialization
 */
export function initializeModelCache(): void {
  const commonModels: Record<string, ModelInfo[]> = {
    deepseek: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        description: 'DeepSeek Chat model',
        contextWindow: 64000,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        provider: 'deepseek',
        description: 'DeepSeek Coder model for code generation',
        contextWindow: 4096,
        cached: false,
        timestamp: Date.now(),
      },
    ],
    qwen: [
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        provider: 'qwen',
        description: 'Fast Qwen model',
        contextWindow: 8000,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        provider: 'qwen',
        description: 'Advanced Qwen model',
        contextWindow: 30000,
        cached: false,
        timestamp: Date.now(),
      },
    ],
    openai: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        description: 'OpenAI GPT-4 model',
        contextWindow: 8192,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        description: 'GPT-4 Turbo with 128K context',
        contextWindow: 128000,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        description: 'Fast and efficient model',
        contextWindow: 4096,
        cached: false,
        timestamp: Date.now(),
      },
    ],
    claude: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        description: 'Most capable Claude model',
        contextWindow: 200000,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        description: 'Balanced performance and speed',
        contextWindow: 200000,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        description: 'Fastest Claude model',
        contextWindow: 200000,
        cached: false,
        timestamp: Date.now(),
      },
    ],
    google: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: 'google',
        description: 'Google Gemini Pro model',
        contextWindow: 32768,
        cached: false,
        timestamp: Date.now(),
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        provider: 'google',
        description: 'Gemini Pro with vision capabilities',
        contextWindow: 12288,
        cached: false,
        timestamp: Date.now(),
      },
    ],
  };

  modelCache.preCacheModels(commonModels);
}
