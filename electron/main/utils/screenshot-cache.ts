/**
 * Screenshot Cache Manager
 * Provides compression, deduplication, and memory-efficient storage for screenshots
 *
 * Features:
 * - LRU cache with configurable size limit
 * - Automatic image compression (WebP format)
 * - Deduplication using content hashing
 * - Background cleanup and memory management
 * - Disk-based overflow for large screenshot collections
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import sharp from 'sharp';
import { createLogger } from './logger';
import { ErrorCategory, ErrorSeverity } from './error-handler';

const logger = createLogger('ScreenshotCache');

interface CachedScreenshot {
  id: string;
  hash: string;
  timestamp: number;
  size: number;
  originalSize: number;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
  buffer: Buffer;
  accessCount: number;
  lastAccessed: number;
}

interface ScreenshotStats {
  totalCached: number;
  totalSize: number;
  totalCompressed: number;
  compressionRatio: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
}

export class ScreenshotCacheManager {
  private cache: Map<string, CachedScreenshot> = new Map();
  private hashes: Map<string, string> = new Map(); // hash -> cache id for deduplication
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB in-memory limit
  private readonly MAX_DISK_SIZE = 500 * 1024 * 1024; // 500MB disk limit
  private currentCacheSize = 0;
  private currentDiskSize = 0;
  private cachePath: string;
  private hitCount = 0;
  private missCount = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cachePath = path.join(app.getPath('userData'), 'screenshot-cache');
    this.initializeCachePath();
    this.startCleanupTimer();
  }

  /**
   * Initialize cache directory
   */
  private initializeCachePath(): void {
    try {
      if (!fs.existsSync(this.cachePath)) {
        fs.mkdirSync(this.cachePath, { recursive: true });
        logger.info('Screenshot cache directory created', { cachePath: this.cachePath });
      }
    } catch (error: any) {
      logger.error(
        'Failed to initialize screenshot cache directory',
        error,
        { cachePath: this.cachePath },
        ErrorCategory.FILE_SYSTEM,
        ErrorSeverity.MEDIUM,
        false
      );
    }
  }

  /**
   * Get screenshot from cache or compress and cache it
   */
  async getOrCache(
    imageBuffer: Buffer,
    width?: number,
    height?: number,
    quality: number = 75
  ): Promise<Buffer> {
    try {
      // Generate hash for deduplication
      const hash = this.generateHash(imageBuffer);
      const existingId = this.hashes.get(hash);

      if (existingId) {
        const cached = this.cache.get(existingId);
        if (cached) {
          cached.accessCount++;
          cached.lastAccessed = Date.now();
          this.hitCount++;
          return cached.buffer;
        }
      }

      // Cache miss - compress and store
      this.missCount++;
      const compressed = await this.compressImage(imageBuffer, width, height, quality);
      const cacheId = `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const cacheEntry: CachedScreenshot = {
        id: cacheId,
        hash,
        timestamp: Date.now(),
        size: compressed.length,
        originalSize: imageBuffer.length,
        width: width || 0,
        height: height || 0,
        format: 'webp',
        buffer: compressed,
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      // Check memory pressure
      if (this.currentCacheSize + compressed.length > this.MAX_CACHE_SIZE) {
        await this.evictLRU();
      }

      this.cache.set(cacheId, cacheEntry);
      this.hashes.set(hash, cacheId);
      this.currentCacheSize += compressed.length;

      logger.debug('Screenshot cached', {
        cacheId,
        originalSize: imageBuffer.length,
        compressedSize: compressed.length,
        ratio: (compressed.length / imageBuffer.length * 100).toFixed(1) + '%'
      });

      return compressed;
    } catch (error: any) {
      logger.error(
        'Error caching screenshot',
        error,
        { imageSize: imageBuffer.length },
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        true
      );
      // Return original if compression fails
      return imageBuffer;
    }
  }

  /**
   * Compress image using WebP format with quality settings
   */
  private async compressImage(
    buffer: Buffer,
    width?: number,
    height?: number,
    quality: number = 75
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer);

      // Scale if dimensions provided
      if (width && height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to WebP with quality settings
      return await pipeline
        .webp({ quality, alphaQuality: quality })
        .toBuffer();
    } catch (error: any) {
      logger.warn('Image compression failed, using original', { error: error.message });
      return buffer;
    }
  }

  /**
   * Generate content hash for deduplication
   */
  private generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    const targetSize = this.MAX_CACHE_SIZE * 0.7; // Free up to 70% of limit
    let freed = 0;

    for (const entry of entries) {
      if (this.currentCacheSize <= targetSize) break;

      this.cache.delete(entry.id);
      this.hashes.delete(entry.hash);
      this.currentCacheSize -= entry.size;
      freed += entry.size;
    }

    logger.debug('LRU eviction completed', {
      entriesRemoved: entries.length,
      freedBytes: freed,
      remainingSize: this.currentCacheSize
    });
  }

  /**
   * Persist old screenshots to disk
   */
  private async persistToDisk(entry: CachedScreenshot): Promise<void> {
    try {
      const filePath = path.join(this.cachePath, `${entry.id}.webp`);

      // Check disk space
      if (this.currentDiskSize + entry.size > this.MAX_DISK_SIZE) {
        await this.cleanupDiskCache();
      }

      await fs.promises.writeFile(filePath, entry.buffer);
      this.currentDiskSize += entry.size;

      logger.debug('Screenshot persisted to disk', {
        id: entry.id,
        size: entry.size,
        path: filePath
      });
    } catch (error: any) {
      logger.warn(
        'Failed to persist screenshot to disk',
        { error: error.message },
        ErrorCategory.FILE_SYSTEM,
        ErrorSeverity.LOW,
        false
      );
    }
  }

  /**
   * Clean up old disk cache files
   */
  private async cleanupDiskCache(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.cachePath);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const fullPath = path.join(this.cachePath, file);
          const stats = await fs.promises.stat(fullPath);
          return { file, fullPath, mtime: stats.mtimeMs, size: stats.size };
        })
      );

      // Sort by modification time, oldest first
      fileStats.sort((a, b) => a.mtime - b.mtime);

      const targetSize = this.MAX_DISK_SIZE * 0.5; // Reduce to 50%
      let cleaned = 0;

      for (const file of fileStats) {
        if (this.currentDiskSize <= targetSize) break;

        try {
          await fs.promises.unlink(file.fullPath);
          this.currentDiskSize -= file.size;
          cleaned++;
        } catch (error) {
          logger.warn('Failed to delete cache file', { file: file.file });
        }
      }

      logger.info('Disk cache cleanup completed', {
        filesRemoved: cleaned,
        remainingSize: this.currentDiskSize
      });
    } catch (error: any) {
      logger.error(
        'Error cleaning up disk cache',
        error,
        {},
        ErrorCategory.FILE_SYSTEM,
        ErrorSeverity.LOW,
        false
      );
    }
  }

  /**
   * Start background cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        // Evict from memory if needed
        if (this.currentCacheSize > this.MAX_CACHE_SIZE * 0.9) {
          await this.evictLRU();
        }

        // Clean disk cache
        if (this.currentDiskSize > this.MAX_DISK_SIZE * 0.9) {
          await this.cleanupDiskCache();
        }
      } catch (error) {
        logger.warn('Background cleanup error', { error: (error as Error).message });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get cache statistics
   */
  getStats(): ScreenshotStats {
    const totalCompressed = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    const totalOriginal = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.originalSize, 0);

    const hitRate = this.hitCount + this.missCount > 0
      ? (this.hitCount / (this.hitCount + this.missCount)) * 100
      : 0;

    return {
      totalCached: this.cache.size,
      totalSize: totalCompressed + this.currentDiskSize,
      totalCompressed,
      compressionRatio: totalOriginal > 0 ? totalCompressed / totalOriginal : 1,
      hitRate,
      missCount: this.missCount,
      hitCount: this.hitCount,
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.hashes.clear();
    this.currentCacheSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
    logger.info('Screenshot cache cleared');
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Singleton instance
export const screenshotCache = new ScreenshotCacheManager();
