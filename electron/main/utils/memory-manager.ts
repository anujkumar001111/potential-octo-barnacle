/**
 * Memory Manager
 * Monitors system memory and triggers cleanup when pressure is detected
 *
 * Features:
 * - Real-time memory pressure monitoring
 * - Automatic garbage collection triggering
 * - Context cleanup with priority levels
 * - Large object detection and cleanup
 * - Memory usage reporting
 */

import { createLogger } from './logger';
import { ErrorCategory, ErrorSeverity } from './error-handler';
import { agentContextManager } from '../services/agent-context-manager';
import { screenshotCache } from './screenshot-cache';
import { screenshotOptimizer } from './screenshot-optimizer';
import v8 from 'v8';

const logger = createLogger('MemoryManager');

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  external: number;
  rss: number;
  pressure: number; // 0-1 scale
  timestamp: number;
}

export interface CleanupReport {
  freed: number;
  duration: number;
  contextsCleanup: number;
  cacheCleanup: number;
  timestamp: number;
}

export class MemoryManager {
  private lastCleanup: number = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MEMORY_THRESHOLD_WARNING = 0.7; // 70%
  private readonly MEMORY_THRESHOLD_CRITICAL = 0.85; // 85%
  private monitorInterval: NodeJS.Timeout | null = null;
  private stats: MemoryStats[] = [];
  private maxStatsHistory = 288; // 24 hours at 5-minute intervals
  private cleanupTimerId: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Get current memory stats
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();

    const heapLimit = v8.getHeapStatistics().heap_size_limit;
    const pressure = memUsage.heapUsed / heapLimit;

    const stats: MemoryStats = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapLimit,
      external: memUsage.external,
      rss: memUsage.rss,
      pressure,
      timestamp: Date.now(),
    };

    this.stats.push(stats);
    if (this.stats.length > this.maxStatsHistory) {
      this.stats.shift();
    }

    return stats;
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      try {
        const stats = this.getMemoryStats();
        screenshotOptimizer.setMemoryPressure(stats.pressure);

        if (stats.pressure > this.MEMORY_THRESHOLD_CRITICAL) {
          logger.warn('CRITICAL memory pressure detected', {
            pressure: (stats.pressure * 100).toFixed(1) + '%',
            heapUsed: this.formatBytes(stats.heapUsed),
            heapLimit: this.formatBytes(stats.heapLimit),
          });
          this.triggerCriticalCleanup();
        } else if (stats.pressure > this.MEMORY_THRESHOLD_WARNING) {
          logger.warn('High memory pressure detected', {
            pressure: (stats.pressure * 100).toFixed(1) + '%',
            heapUsed: this.formatBytes(stats.heapUsed),
          });
          this.triggerCleanup();
        }
      } catch (error) {
        logger.warn('Memory monitoring error', { error: (error as Error).message });
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Trigger normal cleanup
   */
  private triggerCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60000) {
      // Prevent too frequent cleanups
      return;
    }

    this.cleanupTimerId = setTimeout(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        logger.error(
          'Cleanup failed',
          error as Error,
          {},
          ErrorCategory.STORAGE,
          ErrorSeverity.MEDIUM,
          true
        );
      }
    }, 100); // Defer cleanup
  }

  /**
   * Trigger critical cleanup
   */
  private triggerCriticalCleanup(): void {
    this.cleanupTimerId = setTimeout(async () => {
      try {
        await this.cleanup(true);
      } catch (error) {
        logger.error(
          'Critical cleanup failed',
          error as Error,
          {},
          ErrorCategory.STORAGE,
          ErrorSeverity.HIGH,
          true
        );
      }
    }, 50); // Immediate critical cleanup
  }

  /**
   * Perform cleanup operations
   */
  async cleanup(isCritical: boolean = false): Promise<CleanupReport> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    logger.info(isCritical ? 'Critical cleanup started' : 'Cleanup started', {});

    try {
      // Priority 1: Clean old contexts
      const contextsCleanedUp = await agentContextManager.cleanupOldContexts();

      // Priority 2: Evict screenshot cache if critical
      if (isCritical) {
        // Force aggressive screenshot cache cleanup
        const cacheStats = screenshotCache.getStats();
        if (cacheStats.totalSize > 50 * 1024 * 1024) {
          await screenshotCache.clear();
          logger.info('Screenshot cache cleared due to critical memory pressure', {});
        }
      }

      // Priority 3: Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.debug('Garbage collection triggered');
      }

      const endMemory = process.memoryUsage().heapUsed;
      const freed = startMemory - endMemory;
      const duration = Date.now() - startTime;

      this.lastCleanup = Date.now();

      const report: CleanupReport = {
        freed: Math.max(0, freed),
        duration,
        contextsCleanup: contextsCleanedUp,
        cacheCleanup: screenshotCache.getStats().totalCached,
        timestamp: Date.now(),
      };

      logger.info(isCritical ? 'Critical cleanup completed' : 'Cleanup completed', {
        freed: this.formatBytes(report.freed),
        duration: `${report.duration}ms`,
        contextsCleanedUp: report.contextsCleanup,
      });

      return report;
    } catch (error) {
      logger.error(
        'Error during cleanup',
        error as Error,
        { isCritical },
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        true
      );

      return {
        freed: 0,
        duration: Date.now() - startTime,
        contextsCleanup: 0,
        cacheCleanup: 0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get memory trend analysis
   */
  getMemoryTrend(): {
    current: MemoryStats;
    average: number;
    peak: number;
    trend: 'stable' | 'increasing' | 'decreasing';
  } {
    if (this.stats.length === 0) {
      const current = this.getMemoryStats();
      return {
        current,
        average: current.pressure,
        peak: current.pressure,
        trend: 'stable',
      };
    }

    const current = this.stats[this.stats.length - 1];
    const average = this.stats.reduce((sum, s) => sum + s.pressure, 0) / this.stats.length;
    const peak = Math.max(...this.stats.map(s => s.pressure));

    // Determine trend from last 6 measurements
    const recent = this.stats.slice(-6);
    let increasing = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].pressure > recent[i - 1].pressure) {
        increasing++;
      }
    }

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (increasing > 4) {
      trend = 'increasing';
    } else if (increasing < 2) {
      trend = 'decreasing';
    }

    return { current, average, peak, trend };
  }

  /**
   * Get cleanup history
   */
  getMemoryHistory(): MemoryStats[] {
    return [...this.stats];
  }

  /**
   * Format bytes to readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    if (this.cleanupTimerId) {
      clearTimeout(this.cleanupTimerId);
    }
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();
