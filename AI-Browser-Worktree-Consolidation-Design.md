# AI Browser Worktree Consolidation Design Specification

## Overview

This design specification outlines the implementation of LRU cache integration, security enhancements, and comprehensive testing for the Manus Electron AI browser project. The design follows SOLID principles, maintains type safety, and integrates seamlessly with the existing Electron + Next.js architecture.

## 1. LRU Cache Design

### Abstract Cache Interface (OCP Compliance)

Following the Open/Closed Principle, we define a generic cache interface that can be extended without modification.

```typescript
// src/types/cache.ts

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  size: number;
}

export interface CacheOptions {
  maxSize: number;           // Maximum cache size in bytes
  ttl?: number;             // Time-to-live in milliseconds
  cleanupInterval?: number;  // Cleanup interval in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'size-based';
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  itemCount: number;
}

export abstract class Cache<T = any> {
  abstract get<K extends keyof T>(key: K): Promise<T[K] | undefined>;
  abstract set<K extends keyof T>(key: K, value: T[K]): Promise<void>;
  abstract delete<K extends keyof T>(key: K): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract has<K extends keyof T>(key: K): boolean;
  abstract getStats(): CacheStats;
  abstract cleanup(): Promise<void>;
  abstract destroy(): Promise<void>;
}
```

### LRU Cache Implementation

Type-safe LRU implementation with configurable eviction policies.

```typescript
// src/lib/cache/lru-cache.ts

import { Cache, CacheEntry, CacheOptions, CacheStats } from '../../types/cache';

export class LRUCache<T extends Record<string, any>> extends Cache<T> {
  private cache = new Map<string, CacheEntry<T[keyof T]>>();
  private accessOrder = new Set<string>();
  private options: CacheOptions;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions) {
    super();
    this.options = options;
    this.stats = { hits: 0, misses: 0, evictions: 0, totalSize: 0, itemCount: 0 };
    this.startCleanupTimer();
  }

  async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const entry = this.cache.get(key as string);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (this.options.ttl && Date.now() - entry.timestamp > this.options.ttl) {
      await this.delete(key);
      return undefined;
    }

    // Update access patterns
    entry.accessCount++;
    this.accessOrder.delete(key as string);
    this.accessOrder.add(key as string);

    this.stats.hits++;
    return entry.value as T[K];
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    const keyStr = key as string;
    const size = this.calculateSize(value);
    const entry: CacheEntry<T[K]> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };

    // Remove existing entry if present
    if (this.cache.has(keyStr)) {
      const oldEntry = this.cache.get(keyStr)!;
      this.stats.totalSize -= oldEntry.size;
      this.accessOrder.delete(keyStr);
      this.stats.itemCount--;
    }

    // Check size constraints
    if (this.stats.totalSize + size > this.options.maxSize) {
      await this.evictToFit(size);
    }

    this.cache.set(keyStr, entry);
    this.accessOrder.add(keyStr);
    this.stats.totalSize += size;
    this.stats.itemCount++;
  }

  async delete<K extends keyof T>(key: K): Promise<boolean> {
    const keyStr = key as string;
    const entry = this.cache.get(keyStr);
    if (!entry) return false;

    this.cache.delete(keyStr);
    this.accessOrder.delete(keyStr);
    this.stats.totalSize -= entry.size;
    this.stats.itemCount--;
    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, totalSize: 0, itemCount: 0 };
  }

  has<K extends keyof T>(key: K): boolean {
    return this.cache.has(key as string);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.options.ttl && now - entry.timestamp > this.options.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key as keyof T);
    }
  }

  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    await this.clear();
  }

  private async evictToFit(requiredSize: number): Promise<void> {
    const targetSize = this.options.maxSize - requiredSize;

    while (this.stats.totalSize > targetSize && this.cache.size > 0) {
      const keyToEvict = this.getEvictionCandidate();
      if (keyToEvict) {
        await this.delete(keyToEvict as keyof T);
        this.stats.evictions++;
      }
    }
  }

  private getEvictionCandidate(): string | undefined {
    switch (this.options.evictionPolicy) {
      case 'lru':
        return this.accessOrder.values().next().value;
      case 'lfu':
        let minAccess = Infinity;
        let candidate: string | undefined;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            candidate = key;
          }
        }
        return candidate;
      case 'size-based':
        let maxSize = 0;
        let candidate: string | undefined;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.size > maxSize) {
            maxSize = entry.size;
            candidate = key;
          }
        }
        return candidate;
      default:
        return this.accessOrder.values().next().value;
    }
  }

  private calculateSize(value: any): number {
    // Rough size calculation - can be enhanced for specific types
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'object') return JSON.stringify(value).length * 2;
    return 8; // Default size for primitives
  }

  private startCleanupTimer(): void {
    if (this.options.cleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup().catch(console.error);
      }, this.options.cleanupInterval);
    }
  }
}
```

### Integration Points Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Validation      │    │ EkoService       │    │ TaskScheduler   │
│ Middleware      │    │                  │    │                 │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │Rate Limiting│ │    │ │Task Result   │ │    │ │Task State   │ │
│ │Cache        │◄┼────┼─│Cache         │◄┼────┼─│Cache        │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     LRUCache Instance     │
                    │   (Singleton Pattern)     │
                    └───────────────────────────┘
```

## 2. Security Enhancement Design

### Secure API Key Management

Integration with Electron's safeStorage for encrypted persistence.

```typescript
// electron/main/utils/secure-config.ts

import { safeStorage } from 'electron';

export interface SecureKeyConfig {
  key: string;
  encrypted: boolean;
  lastRotated?: Date;
}

export class SecureConfigManager {
  private static instance: SecureConfigManager;
  private encryptionAvailable: boolean;

  private constructor() {
    this.encryptionAvailable = safeStorage.isEncryptionAvailable();
  }

  static getInstance(): SecureConfigManager {
    if (!SecureConfigManager.instance) {
      SecureConfigManager.instance = new SecureConfigManager();
    }
    return SecureConfigManager.instance;
  }

  async encryptValue(plainText: string): Promise<string> {
    if (!this.encryptionAvailable) {
      throw new Error('Safe storage encryption not available');
    }

    const buffer = Buffer.from(plainText, 'utf8');
    const encrypted = safeStorage.encryptString(buffer);
    return encrypted.toString('base64');
  }

  async decryptValue(encryptedText: string): Promise<string> {
    if (!this.encryptionAvailable) {
      throw new Error('Safe storage encryption not available');
    }

    const buffer = Buffer.from(encryptedText, 'base64');
    return safeStorage.decryptString(buffer);
  }

  async saveSecureKey(key: string, value: string): Promise<void> {
    const encrypted = await this.encryptValue(value);
    const config: SecureKeyConfig = {
      key,
      encrypted: true,
      lastRotated: new Date()
    };

    // Store in electron-store with encryption metadata
    const store = await this.getSecureStore();
    await store.set(`secure.${key}`, { ...config, value: encrypted });
  }

  async getSecureKey(key: string): Promise<string | null> {
    const store = await this.getSecureStore();
    const config = store.get(`secure.${key}`) as SecureKeyConfig & { value: string };

    if (!config || !config.encrypted) return null;

    try {
      return await this.decryptValue(config.value);
    } catch (error) {
      console.error(`Failed to decrypt key ${key}:`, error);
      return null;
    }
  }

  private async getSecureStore(): Promise<any> {
    // Implementation using electron-store with secure namespace
    const { default: Store } = await import('electron-store');
    return new Store({
      name: 'secure-config',
      encryptionKey: await this.getEncryptionKey()
    });
  }

  private async getEncryptionKey(): Promise<string> {
    // Generate or retrieve device-specific encryption key
    // Implementation details depend on security requirements
    return 'device-specific-key';
  }
}
```

### ConfigManager Security Hierarchy

Implements secure API key resolution with fallback chain.

```typescript
// electron/main/utils/config-manager.ts (Enhanced)

import { SecureConfigManager } from './secure-config';

export class ConfigManager {
  private static instance: ConfigManager;
  private secureManager: SecureConfigManager;

  private constructor() {
    this.secureManager = SecureConfigManager.getInstance();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Resolves API key with security hierarchy:
   * 1. User-configured secure storage (encrypted)
   * 2. Environment variables (plaintext)
   * 3. Default fallback values
   */
  async getApiKey(provider: string): Promise<string | null> {
    // 1. Check secure user configuration
    const secureKey = await this.secureManager.getSecureKey(`api.${provider}`);
    if (secureKey) return secureKey;

    // 2. Check environment variables
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (envKey) return envKey;

    // 3. Return default (if any)
    return this.getDefaultApiKey(provider);
  }

  private getDefaultApiKey(provider: string): string | null {
    const defaults = {
      // Only include non-sensitive defaults
      // Never include real API keys here
    };
    return defaults[provider] || null;
  }
}
```

### IPC Validation Middleware

Input validation and rate limiting with Zod schemas.

```typescript
// electron/main/ipc/validation-middleware.ts

import { z } from 'zod';
import { LRUCache } from '../../../src/lib/cache/lru-cache';
import { CacheOptions } from '../../../src/types/cache';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new LRUCache<{
  [key: string]: RateLimitEntry;
}>({
  maxSize: 1024 * 1024, // 1MB
  ttl: 60 * 1000, // 1 minute
  cleanupInterval: 30 * 1000, // 30 seconds
  evictionPolicy: 'lru'
});

// Validation schemas
export const ApiKeySchema = z.object({
  provider: z.enum(['deepseek', 'qwen', 'google', 'anthropic', 'openrouter']),
  key: z.string().min(1).max(1000)
});

export const ModelConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(100000).optional()
});

export const TaskExecutionSchema = z.object({
  taskId: z.string().uuid(),
  prompt: z.string().min(1).max(10000),
  options: z.object({
    timeout: z.number().min(1000).max(300000).optional(),
    maxRetries: z.number().min(0).max(5).optional()
  }).optional()
});

export class IPCValidationMiddleware {
  private rateLimits: Map<string, { limit: number; window: number }> = new Map([
    ['api-config', { limit: 10, window: 60000 }], // 10 requests per minute
    ['task-execution', { limit: 5, window: 60000 }], // 5 tasks per minute
    ['model-config', { limit: 20, window: 60000 }] // 20 config changes per minute
  ]);

  async validateAndRateLimit(
    endpoint: string,
    data: any,
    clientId: string
  ): Promise<{ valid: boolean; data?: any; error?: string }> {
    try {
      // Rate limiting check
      const rateLimitResult = await this.checkRateLimit(endpoint, clientId);
      if (!rateLimitResult.allowed) {
        return {
          valid: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds`
        };
      }

      // Input validation
      const validatedData = await this.validateInput(endpoint, data);

      // Sanitization
      const sanitizedData = this.sanitizeInput(validatedData);

      return { valid: true, data: sanitizedData };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  private async checkRateLimit(endpoint: string, clientId: string): Promise<{
    allowed: boolean;
    resetIn: number;
  }> {
    const config = this.rateLimits.get(endpoint);
    if (!config) return { allowed: true, resetIn: 0 };

    const cacheKey = `${endpoint}:${clientId}`;
    const entry = await rateLimitCache.get(cacheKey);

    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      // New window
      await rateLimitCache.set(cacheKey, {
        count: 1,
        resetTime: now + config.window
      });
      return { allowed: true, resetIn: 0 };
    }

    if (entry.count >= config.limit) {
      return { allowed: false, resetIn: entry.resetTime - now };
    }

    // Increment counter
    await rateLimitCache.set(cacheKey, {
      count: entry.count + 1,
      resetTime: entry.resetTime
    });

    return { allowed: true, resetIn: 0 };
  }

  private async validateInput(endpoint: string, data: any): Promise<any> {
    const schema = this.getSchemaForEndpoint(endpoint);
    return schema.parse(data);
  }

  private getSchemaForEndpoint(endpoint: string): z.ZodSchema {
    switch (endpoint) {
      case 'saveUserModelConfigs':
        return z.array(ModelConfigSchema);
      case 'ekoRun':
        return TaskExecutionSchema;
      case 'saveApiKey':
        return ApiKeySchema;
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  private sanitizeInput(data: any): any {
    // Remove potential XSS vectors
    if (typeof data === 'string') {
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      for (const key in sanitized) {
        sanitized[key] = this.sanitizeInput(sanitized[key]);
      }
      return sanitized;
    }

    return data;
  }
}
```

## 3. Testing Framework Design

### Jest Test Suite Structure

Comprehensive test organization following testing best practices.

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/electron/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'electron/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!electron/**/*.d.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10000,
  maxWorkers: 4
};
```

```typescript
// jest.setup.ts
import { jest } from '@jest/globals';

// Mock Electron APIs
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
    getVersion: jest.fn(),
    on: jest.fn()
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  },
  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((buffer) => buffer),
    decryptString: jest.fn((buffer) => buffer.toString())
  }
}));

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  }));
});

// Global test utilities
global.testUtils = {
  createMockIpcEvent: (data: any) => ({
    sender: { send: jest.fn() },
    returnValue: undefined,
    ...data
  }),

  waitForIpcMessage: (ipcMain: any, channel: string, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for IPC message on ${channel}`));
      }, timeout);

      ipcMain.on.mockImplementation((ch: string, handler: Function) => {
        if (ch === channel) {
          clearTimeout(timer);
          resolve(handler);
        }
      });
    });
  }
};
```

### Mock Strategy for Electron APIs

Comprehensive mocking for isolated unit testing.

```typescript
// tests/mocks/electron-mocks.ts

export const mockElectronAPIs = {
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    removeHandler: jest.fn(),
    removeListener: jest.fn()
  },

  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
      executeJavaScript: jest.fn(),
      session: {
        cookies: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    }
  })),

  safeStorage: {
    isEncryptionAvailable: jest.fn(() => true),
    encryptString: jest.fn((buffer) => Buffer.from('encrypted_' + buffer.toString())),
    decryptString: jest.fn((buffer) => Buffer.from(buffer.toString().replace('encrypted_', '')))
  },

  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn()
  }
};

// IPC Handler Mocks
export const createMockIpcHandler = (handler: Function) => {
  return jest.fn().mockImplementation(async (event, ...args) => {
    try {
      const result = await handler(event, ...args);
      return result;
    } catch (error) {
      event.sender.send('error', error.message);
      throw error;
    }
  });
};
```

### Integration Test Approach

Cross-service testing with proper isolation.

```typescript
// tests/integration/cache-integration.test.ts

import { LRUCache } from '../../src/lib/cache/lru-cache';
import { EkoService } from '../../electron/main/services/eko-service';
import { ValidationMiddleware } from '../../electron/main/ipc/validation-middleware';

describe('Cache Integration Tests', () => {
  let cache: LRUCache<any>;
  let ekoService: EkoService;
  let validationMiddleware: ValidationMiddleware;

  beforeEach(async () => {
    // Setup isolated cache instance
    cache = new LRUCache({
      maxSize: 1024 * 1024, // 1MB
      ttl: 300000, // 5 minutes
      evictionPolicy: 'lru'
    });

    // Mock EkoService with cache dependency
    ekoService = new EkoService(cache);

    // Setup validation middleware
    validationMiddleware = new ValidationMiddleware();
  });

  afterEach(async () => {
    await cache.destroy();
  });

  test('EkoService should cache task results', async () => {
    const taskPrompt = 'Navigate to example.com and take screenshot';
    const mockResult = { screenshot: 'base64data', url: 'https://example.com' };

    // First execution - should cache result
    const result1 = await ekoService.executeTask(taskPrompt);
    expect(result1).toEqual(mockResult);

    // Verify cache contains result
    const cached = await cache.get(`task:${taskPrompt}`);
    expect(cached).toEqual(mockResult);

    // Second execution - should use cache
    const result2 = await ekoService.executeTask(taskPrompt);
    expect(result2).toEqual(mockResult);

    // Verify cache hit
    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThan(0);
  });

  test('Rate limiting should use cache for tracking', async () => {
    const clientId = 'test-client';
    const endpoint = 'task-execution';

    // Simulate rapid requests
    for (let i = 0; i < 6; i++) {
      const result = await validationMiddleware.validateAndRateLimit(
        endpoint,
        { taskId: `task-${i}`, prompt: 'test' },
        clientId
      );

      if (i < 5) {
        expect(result.valid).toBe(true);
      } else {
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      }
    }
  });

  test('Cache cleanup should remove expired entries', async () => {
    // Set very short TTL for testing
    const fastCache = new LRUCache({
      maxSize: 1024 * 1024,
      ttl: 100, // 100ms
      cleanupInterval: 50, // 50ms
      evictionPolicy: 'lru'
    });

    await fastCache.set('test-key', 'test-value');

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    const value = await fastCache.get('test-key');
    expect(value).toBeUndefined();

    await fastCache.destroy();
  });
});
```

### Test Data and Fixtures

Structured test data for comprehensive coverage.

```typescript
// tests/fixtures/test-data.ts

export const mockApiKeys = {
  deepseek: 'sk-test-deepseek-key-1234567890abcdef',
  anthropic: 'sk-ant-test-key-1234567890abcdef',
  openai: 'sk-test-openai-key-1234567890abcdef'
};

export const mockModelConfigs = [
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4000
  },
  {
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.8,
    maxTokens: 8000
  }
];

export const mockTaskExecutions = [
  {
    taskId: '550e8400-e29b-41d4-a716-446655440000',
    prompt: 'Navigate to https://example.com and extract the main heading',
    options: {
      timeout: 30000,
      maxRetries: 2
    },
    expectedResult: {
      heading: 'Example Domain',
      url: 'https://example.com'
    }
  },
  {
    taskId: '550e8400-e29b-41d4-a716-446655440001',
    prompt: 'Take a screenshot of the current page',
    options: {
      timeout: 15000
    },
    expectedResult: {
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      dimensions: { width: 800, height: 600 }
    }
  }
];

export const mockCacheEntries = {
  taskResults: [
    {
      key: 'task:navigate-example',
      value: { url: 'https://example.com', title: 'Example Domain' },
      size: 256
    },
    {
      key: 'task:screenshot-test',
      value: { screenshot: 'base64data...', dimensions: { width: 800, height: 600 } },
      size: 1024
    }
  ],
  validationCache: [
    {
      key: 'rate-limit:client-123:task-execution',
      value: { count: 3, resetTime: Date.now() + 60000 },
      size: 128
    }
  ]
};
```

## 4. Worktree Consolidation Design

### Merge Strategy

Systematic approach to consolidate multiple feature branches.

```typescript
// scripts/consolidate-worktrees.ts

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface BranchInfo {
  name: string;
  commits: string[];
  conflicts: string[];
  status: 'pending' | 'merging' | 'completed' | 'failed';
}

interface ConsolidationPlan {
  mainBranch: string;
  featureBranches: BranchInfo[];
  mergeOrder: string[];
  conflictResolution: Map<string, string>;
  rollbackSteps: string[];
}

export class WorktreeConsolidator {
  private plan: ConsolidationPlan;

  constructor() {
    this.plan = {
      mainBranch: 'main',
      featureBranches: [],
      mergeOrder: [],
      conflictResolution: new Map(),
      rollbackSteps: []
    };
  }

  async analyzeBranches(): Promise<void> {
    // Identify all feature branches
    const branches = this.getGitBranches();
    this.plan.featureBranches = branches
      .filter(branch => branch !== 'main' && !branch.startsWith('fix-'))
      .map(branch => ({
        name: branch,
        commits: this.getBranchCommits(branch),
        conflicts: [],
        status: 'pending' as const
      }));

    // Identify duplicate branches
    const duplicates = this.findDuplicateBranches(branches);
    this.plan.mergeOrder = this.calculateMergeOrder(duplicates);
  }

  async executeConsolidation(): Promise<void> {
    for (const branchName of this.plan.mergeOrder) {
      const branch = this.plan.featureBranches.find(b => b.name === branchName);
      if (!branch) continue;

      try {
        branch.status = 'merging';
        await this.mergeBranch(branch);
        branch.status = 'completed';
      } catch (error) {
        branch.status = 'failed';
        await this.handleMergeConflict(branch, error);
      }
    }
  }

  private async mergeBranch(branch: BranchInfo): Promise<void> {
    // Checkout main branch
    execSync(`git checkout ${this.plan.mainBranch}`, { stdio: 'inherit' });

    // Pull latest changes
    execSync('git pull origin main', { stdio: 'inherit' });

    // Merge feature branch
    try {
      execSync(`git merge --no-ff ${branch.name} -m "Merge branch '${branch.name}' into main"`, {
        stdio: 'inherit'
      });
    } catch (error) {
      // Conflict detected
      branch.conflicts = this.identifyConflicts();
      throw error;
    }

    // Run tests
    execSync('npm test', { stdio: 'inherit' });

    // Push consolidated changes
    execSync('git push origin main', { stdio: 'inherit' });

    // Delete merged branch
    execSync(`git branch -d ${branch.name}`, { stdio: 'inherit' });
  }

  private async handleMergeConflict(branch: BranchInfo, error: any): Promise<void> {
    // Identify conflict files
    const conflictedFiles = execSync('git diff --name-only --diff-filter=U')
      .toString()
      .trim()
      .split('\n');

    // Apply predefined conflict resolution
    for (const file of conflictedFiles) {
      const resolution = this.plan.conflictResolution.get(file);
      if (resolution) {
        writeFileSync(file, resolution);
        execSync(`git add ${file}`);
      }
    }

    // Continue merge
    execSync('git commit -m "Resolve merge conflicts"', { stdio: 'inherit' });
  }

  private findDuplicateBranches(branches: string[]): Map<string, string[]> {
    const duplicates = new Map<string, string[]>();
    const branchMap = new Map<string, string[]>();

    for (const branch of branches) {
      const baseName = branch.replace(/-(add|fix|refactor)-\w+$/, '');
      if (!branchMap.has(baseName)) {
        branchMap.set(baseName, []);
      }
      branchMap.get(baseName)!.push(branch);
    }

    for (const [baseName, branchList] of branchMap) {
      if (branchList.length > 1) {
        duplicates.set(baseName, branchList);
      }
    }

    return duplicates;
  }

  private calculateMergeOrder(duplicates: Map<string, string[]>): string[] {
    const order: string[] = [];

    // Priority order: security > cache > testing > other
    const priorityPatterns = [
      /security|encryption|auth/,
      /cache|lru|memory/,
      /test|spec|fixture/,
      /.*/
    ];

    for (const pattern of priorityPatterns) {
      for (const [baseName, branches] of duplicates) {
        if (pattern.test(baseName) && !order.some(o => branches.includes(o))) {
          // Choose the most complete branch
          const bestBranch = this.selectBestBranch(branches);
          order.push(bestBranch);
        }
      }
    }

    return order;
  }

  private selectBestBranch(branches: string[]): string {
    // Select branch with most commits or latest activity
    return branches.reduce((best, current) => {
      const bestCommits = this.getBranchCommits(best).length;
      const currentCommits = this.getBranchCommits(current).length;
      return currentCommits > bestCommits ? current : best;
    });
  }

  private getGitBranches(): string[] {
    return execSync('git branch --format="%(refname:short)"')
      .toString()
      .trim()
      .split('\n');
  }

  private getBranchCommits(branch: string): string[] {
    try {
      return execSync(`git log --oneline ${branch} --not main`)
        .toString()
        .trim()
        .split('\n')
        .filter(line => line.length > 0);
    } catch {
      return [];
    }
  }

  private identifyConflicts(): string[] {
    return execSync('git diff --name-only --diff-filter=U')
      .toString()
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  }

  async createRollbackPlan(): Promise<void> {
    // Create rollback commits for each merge
    this.plan.rollbackSteps = [
      'git reset --hard HEAD~1', // Rollback last merge
      'git push origin main --force-with-lease', // Force push rollback
      'git branch -D merged-branches', // Clean up any temporary branches
    ];
  }

  async executeRollback(): Promise<void> {
    for (const step of this.plan.rollbackSteps) {
      try {
        execSync(step, { stdio: 'inherit' });
      } catch (error) {
        console.error(`Rollback step failed: ${step}`, error);
        break;
      }
    }
  }
}

// Usage
const consolidator = new WorktreeConsolidator();
await consolidator.analyzeBranches();
await consolidator.createRollbackPlan();

try {
  await consolidator.executeConsolidation();
  console.log('Consolidation completed successfully');
} catch (error) {
  console.error('Consolidation failed, initiating rollback...');
  await consolidator.executeRollback();
}
```

### Conflict Resolution Strategy

Predefined conflict resolution rules for common scenarios.

```typescript
// scripts/conflict-resolutions.ts

export const conflictResolutions = new Map<string, string>([
  // Cache configuration conflicts - take the larger maxSize
  ['src/lib/cache/lru-cache.ts', `
export class LRUCache<T extends Record<string, any>> extends Cache<T> {
  constructor(options: CacheOptions) {
    super();
    this.options = {
      ...options,
      maxSize: Math.max(options.maxSize, 2 * 1024 * 1024) // At least 2MB
    };
  }
}
  `],

  // Security middleware conflicts - combine validation rules
  ['electron/main/ipc/validation-middleware.ts', `
export class IPCValidationMiddleware {
  constructor() {
    // Combine rate limits from both branches
    this.rateLimits.set('api-config', { limit: 10, window: 60000 });
    this.rateLimits.set('task-execution', { limit: 5, window: 60000 });
    this.rateLimits.set('model-config', { limit: 20, window: 60000 });
    // Add security-specific limits
    this.rateLimits.set('secure-config', { limit: 5, window: 300000 }); // 5 per 5 minutes
  }
}
  `],

  // Test configuration conflicts - merge Jest configs
  ['jest.config.js', `
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/electron/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts' // Added integration tests
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'electron/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!electron/**/*.d.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 10000,
  maxWorkers: 4,
  // Security testing configuration
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts'
};
  `]
]);
```

### Rollback and Recovery Procedures

Comprehensive rollback strategy with multiple recovery points.

```typescript
// scripts/rollback-manager.ts

export class RollbackManager {
  private checkpoints: Map<string, string> = new Map();

  async createCheckpoint(name: string): Promise<void> {
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    this.checkpoints.set(name, commitHash);
    execSync(`git tag checkpoint-${name}-${Date.now()}`);
  }

  async rollbackToCheckpoint(name: string): Promise<void> {
    const commitHash = this.checkpoints.get(name);
    if (!commitHash) {
      throw new Error(`Checkpoint ${name} not found`);
    }

    // Create backup branch before rollback
    const backupBranch = `backup-${name}-${Date.now()}`;
    execSync(`git checkout -b ${backupBranch}`);

    // Rollback to checkpoint
    execSync(`git reset --hard ${commitHash}`);

    // Force push if needed (use with caution)
    execSync('git push origin main --force-with-lease');
  }

  async emergencyRollback(): Promise<void> {
    // Immediate rollback to last known good state
    const lastGoodCommit = this.findLastGoodCommit();
    execSync(`git reset --hard ${lastGoodCommit}`);
    execSync('git push origin main --force-with-lease');
  }

  private findLastGoodCommit(): string {
    // Implementation to find last commit where tests passed
    // This would integrate with CI/CD pipeline
    return execSync('git log --oneline --grep="tests passed" -n 1 | cut -d" " -f1')
      .toString()
      .trim();
  }

  async verifyRollback(): Promise<void> {
    // Run tests to verify rollback state
    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log('Rollback verification: PASSED');
    } catch (error) {
      console.error('Rollback verification: FAILED');
      throw error;
    }
  }
}
```

This design specification provides a comprehensive blueprint for implementing LRU cache integration, security enhancements, testing, and worktree consolidation while maintaining SOLID principles and avoiding over-engineering. The implementation focuses on type safety, proper abstraction, and seamless integration with the existing Electron + Next.js architecture.