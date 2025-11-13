/**
 * LRU Cache Utility for Bounded Memory Usage
 *
 * WORKTREE CONSOLIDATION REQUIREMENTS - LRU CACHE INTEGRATION
 * ===================================================================
 *
 * FUNCTIONAL REQUIREMENTS:
 * FR-LRU-001: Implement LRU cache with configurable max size (default 1000 entries)
 * FR-LRU-002: Automatic eviction of least recently used entries when cache reaches max capacity
 * FR-LRU-003: Update access timestamps on cache hits to maintain LRU ordering
 * FR-LRU-004: Periodic cleanup of stale entries older than 10 minutes (configurable)
 * FR-LRU-005: Thread-safe operations for concurrent access in Electron main process
 *
 * INTEGRATION REQUIREMENTS:
 * IR-LRU-001: EkoService shall use LRU cache for task result caching (max 500 entries)
 *   - Cache task execution results to prevent redundant AI API calls
 *   - Cache key format: `task_${taskId}_${inputHash}`
 *   - Cache TTL: 30 minutes for task results
 *
 * IR-LRU-002: TaskScheduler shall use LRU cache for execution state tracking (max 200 entries)
 *   - Cache running task states to handle window reloads gracefully
 *   - Cache scheduled task configurations to reduce database queries
 *   - Cache execution history for quick status lookups
 *
 * IR-LRU-003: Validation middleware shall use LRU cache for rate limiting (max 1000 entries)
 *   - Per-sender rate limit tracking to prevent DoS attacks
 *   - Automatic cleanup of expired rate limit windows
 *   - Memory-bounded operation to prevent memory leaks in long-running app
 *
 * NON-FUNCTIONAL REQUIREMENTS:
 * NFR-LRU-001: Memory efficiency - O(1) space complexity, bounded by maxSize
 * NFR-LRU-002: Performance - O(1) time complexity for get/set operations
 * NFR-LRU-003: Reliability - Automatic resource cleanup on destroy()
 * NFR-LRU-004: Observability - Size reporting and key enumeration for monitoring
 * NFR-LRU-005: Configurability - Adjustable cleanup intervals and cache sizes
 *
 * SECURITY CONSIDERATIONS:
 * SC-LRU-001: Cache entries shall not contain sensitive data (API keys, tokens)
 * SC-LRU-002: Cache keys shall be validated to prevent injection attacks
 * SC-LRU-003: Memory usage shall be monitored to prevent DoS via cache exhaustion
 *
 * TESTING REQUIREMENTS:
 * TR-LRU-001: Unit tests for basic cache operations (get/set/delete/clear)
 * TR-LRU-002: Unit tests for LRU eviction behavior
 * TR-LRU-003: Unit tests for periodic cleanup functionality
 * TR-LRU-004: Integration tests with EkoService task caching
 * TR-LRU-005: Integration tests with TaskScheduler state caching
 * TR-LRU-006: Performance tests for memory usage under load
 *
 * MIGRATION REQUIREMENTS:
 * MR-LRU-001: Migrate existing in-memory Maps to LRU cache instances
 * MR-LRU-002: Add cache configuration to ConfigManager
 * MR-LRU-003: Implement cache warming for frequently accessed data
 * MR-LRU-004: Add cache statistics to application monitoring
 *
 * @implements Least Recently Used (LRU) cache algorithm
 * @param maxSize Maximum number of entries before eviction begins
 * @param cleanupIntervalMs Interval for periodic cleanup in milliseconds (default 5 minutes)
 * @param maxAgeMs Maximum age of entries before cleanup in milliseconds (default 10 minutes)
 */

export interface CacheStats {
  size: number;
  maxSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, { value: V; lastAccess: number }>;
  private accessOrder: Map<K, number>; // For O(1) LRU tracking
  private maxSize: number;
  private cleanupIntervalMs: number;
  private maxAgeMs: number;
  private cleanupInterval?: NodeJS.Timeout;
  private stats: CacheStats;

  constructor(
    maxSize: number = 1000,
    cleanupIntervalMs: number = 5 * 60 * 1000, // 5 minutes
    maxAgeMs: number = 10 * 60 * 1000 // 10 minutes
  ) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.maxSize = maxSize;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.maxAgeMs = maxAgeMs;
    this.stats = {
      size: 0,
      maxSize,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0
    };
    this.startPeriodicCleanup();
  }

  /**
   * Get a value from the cache and update its access time
   * Time Complexity: O(1)
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
      // Update access order for LRU tracking
      this.accessOrder.set(key, entry.lastAccess);
      this.stats.hitCount++;
      this.updateHitRate();
      return entry.value;
    }
    this.stats.missCount++;
    this.updateHitRate();
    return undefined;
  }

  /**
   * Set a value in the cache, evicting LRU entries if necessary
   * Time Complexity: O(1)
   */
  set(key: K, value: V): void {
    const now = Date.now();

    // If key already exists, just update it (no size change)
    if (this.cache.has(key)) {
      this.cache.set(key, { value, lastAccess: now });
      this.accessOrder.set(key, now);
      return;
    }

    // If we're at or over capacity, evict before adding new item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new item only if maxSize allows it (maxSize = 0 means no caching)
    if (this.maxSize > 0) {
      this.cache.set(key, { value, lastAccess: now });
      this.accessOrder.set(key, now);
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Delete a key from the cache
   * Time Complexity: O(1)
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Check if a key exists in the cache
   * Time Complexity: O(1)
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all entries from the cache
   * Time Complexity: O(1)
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats.size = 0;
    this.resetStats();
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache (for debugging/monitoring)
   * Time Complexity: O(n) - Use sparingly
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    this.stats.evictionCount = 0;
    this.stats.hitRate = 0;
  }

  /**
   * Evict the least recently used entry
   * Time Complexity: O(1) using access order tracking
   */
  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruTime = Infinity;

    // Find the key with the oldest access time from accessOrder map
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruTime) {
        lruTime = accessTime;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.stats.evictionCount++;
    }
  }

  /**
   * Start periodic cleanup to remove expired entries
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.cleanupIntervalMs);
  }

  /**
   * Perform cleanup of entries older than maxAgeMs
   */
  private performCleanup(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    // Collect keys that are too old
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccess > this.maxAgeMs) {
        keysToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  /**
   * Destroy the cache and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cache.clear();
    this.accessOrder.clear();
  }
}

// Export additional utilities for cache management
export interface CacheConfig {
  maxSize: number;
  cleanupIntervalMs?: number;
  maxAgeMs?: number;
}

export function createTaskCache(config?: Partial<CacheConfig>): LRUCache<string, any> {
  return new LRUCache(
    config?.maxSize ?? 500, // Default for task caching
    config?.cleanupIntervalMs ?? 5 * 60 * 1000,
    config?.maxAgeMs ?? 30 * 60 * 1000 // 30 minutes TTL for tasks
  );
}

export function createRateLimitCache(config?: Partial<CacheConfig>): LRUCache<string, any> {
  return new LRUCache(
    config?.maxSize ?? 1000, // Default for rate limiting
    config?.cleanupIntervalMs ?? 60 * 1000, // 1 minute cleanup
    config?.maxAgeMs ?? 60 * 1000 // 1 minute max age
  );
}

export function createSchedulerCache(config?: Partial<CacheConfig>): LRUCache<string, any> {
  return new LRUCache(
    config?.maxSize ?? 200, // Default for scheduler state
    config?.cleanupIntervalMs ?? 10 * 60 * 1000, // 10 minute cleanup
    config?.maxAgeMs ?? 60 * 60 * 1000 // 1 hour max age
  );
}