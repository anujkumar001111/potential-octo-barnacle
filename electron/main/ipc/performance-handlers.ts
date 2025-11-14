/**
 * Performance Optimization IPC Handlers
 * Provides API for monitoring and managing performance optimizations
 */

import { ipcMain } from 'electron';
import { memoryManager } from '../utils/memory-manager';
import { screenshotCache } from '../utils/screenshot-cache';
import { screenshotOptimizer, ScreenshotUseCase } from '../utils/screenshot-optimizer';
import { modelCache, initializeModelCache } from '../utils/model-cache';
import { createLogger } from '../utils/logger';
import { ErrorCategory, ErrorSeverity } from '../utils/error-handler';

const logger = createLogger('PerformanceHandlers');

/**
 * Register performance optimization IPC handlers
 */
export function registerPerformanceHandlers(): void {
  /**
   * Get current memory statistics
   */
  ipcMain.handle('perf:get-memory-stats', async () => {
    try {
      const stats = memoryManager.getMemoryStats();
      return {
        success: true,
        stats: {
          heapUsed: stats.heapUsed,
          heapTotal: stats.heapTotal,
          heapLimit: stats.heapLimit,
          external: stats.external,
          rss: stats.rss,
          pressure: stats.pressure,
          pressurePercent: (stats.pressure * 100).toFixed(1) + '%',
          timestamp: stats.timestamp,
        },
      };
    } catch (error: any) {
      logger.error(
        'Error getting memory stats',
        error,
        {},
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Get memory trend analysis
   */
  ipcMain.handle('perf:get-memory-trend', async () => {
    try {
      const trend = memoryManager.getMemoryTrend();
      return {
        success: true,
        trend: {
          current: trend.current,
          averagePressure: (trend.average * 100).toFixed(1) + '%',
          peakPressure: (trend.peak * 100).toFixed(1) + '%',
          trend: trend.trend,
        },
      };
    } catch (error: any) {
      logger.error(
        'Error getting memory trend',
        error,
        {},
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Trigger manual cleanup
   */
  ipcMain.handle('perf:trigger-cleanup', async (event, isCritical?: boolean) => {
    try {
      logger.info('Manual cleanup triggered', { isCritical });
      const report = await memoryManager.cleanup(isCritical || false);

      return {
        success: true,
        report: {
          freed: report.freed,
          duration: report.duration,
          contextsCleanup: report.contextsCleanup,
          cacheCleanup: report.cacheCleanup,
        },
      };
    } catch (error: any) {
      logger.error(
        'Error triggering cleanup',
        error,
        { isCritical },
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Get screenshot cache statistics
   */
  ipcMain.handle('perf:get-screenshot-cache-stats', async () => {
    try {
      const stats = screenshotCache.getStats();
      return {
        success: true,
        stats: {
          totalCached: stats.totalCached,
          totalSize: stats.totalSize,
          totalCompressed: stats.totalCompressed,
          compressionRatio: (stats.compressionRatio * 100).toFixed(1) + '%',
          hitRate: stats.hitRate.toFixed(1) + '%',
          hits: stats.hitCount,
          misses: stats.missCount,
        },
      };
    } catch (error: any) {
      logger.error(
        'Error getting screenshot cache stats',
        error,
        {},
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Clear screenshot cache
   */
  ipcMain.handle('perf:clear-screenshot-cache', async () => {
    try {
      await screenshotCache.clear();
      logger.info('Screenshot cache cleared via IPC');
      return { success: true, message: 'Screenshot cache cleared' };
    } catch (error: any) {
      logger.error(
        'Error clearing screenshot cache',
        error,
        {},
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Get model cache statistics
   */
  ipcMain.handle('perf:get-model-cache-stats', async () => {
    try {
      const stats = modelCache.getStats();
      return {
        success: true,
        stats: {
          cachedProviders: stats.cachedProviders,
          modelCacheSize: stats.modelCacheSize,
          capabilitiesCacheSize: stats.capabilitiesCacheSize,
          configCacheSize: stats.configCacheSize,
        },
      };
    } catch (error: any) {
      logger.error(
        'Error getting model cache stats',
        error,
        {},
        ErrorCategory.CONFIG,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Initialize model cache with default models
   */
  ipcMain.handle('perf:initialize-model-cache', async () => {
    try {
      initializeModelCache();
      const stats = modelCache.getStats();
      logger.info('Model cache initialized');
      return {
        success: true,
        providers: stats.cachedProviders,
      };
    } catch (error: any) {
      logger.error(
        'Error initializing model cache',
        error,
        {},
        ErrorCategory.CONFIG,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Clear model cache
   */
  ipcMain.handle('perf:clear-model-cache', async (event, provider?: string) => {
    try {
      if (provider) {
        modelCache.clearProvider(provider);
        logger.info('Model cache cleared for provider', { provider });
      } else {
        modelCache.clearAll();
        logger.info('All model caches cleared');
      }
      return { success: true, message: 'Model cache cleared' };
    } catch (error: any) {
      logger.error(
        'Error clearing model cache',
        error,
        { provider },
        ErrorCategory.CONFIG,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Get memory usage history
   */
  ipcMain.handle('perf:get-memory-history', async (event, limit?: number) => {
    try {
      const history = memoryManager.getMemoryHistory();
      const limited = limit ? history.slice(-limit) : history;

      return {
        success: true,
        history: limited.map(stat => ({
          heapUsed: stat.heapUsed,
          heapTotal: stat.heapTotal,
          pressure: (stat.pressure * 100).toFixed(1) + '%',
          timestamp: stat.timestamp,
        })),
      };
    } catch (error: any) {
      logger.error(
        'Error getting memory history',
        error,
        { limit },
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  /**
   * Get comprehensive performance report
   */
  ipcMain.handle('perf:get-performance-report', async () => {
    try {
      const memoryStats = memoryManager.getMemoryStats();
      const memoryTrend = memoryManager.getMemoryTrend();
      const screenshotStats = screenshotCache.getStats();
      const modelCacheStats = modelCache.getStats();

      return {
        success: true,
        report: {
          memory: {
            current: memoryStats,
            trend: memoryTrend.trend,
            pressure: (memoryStats.pressure * 100).toFixed(1) + '%',
          },
          screenshot: {
            cached: screenshotStats.totalCached,
            totalSize: screenshotStats.totalSize,
            compressionRatio: (screenshotStats.compressionRatio * 100).toFixed(1) + '%',
            hitRate: screenshotStats.hitRate.toFixed(1) + '%',
          },
          models: {
            providers: modelCacheStats.cachedProviders,
            totalCached: modelCacheStats.modelCacheSize +
              modelCacheStats.capabilitiesCacheSize +
              modelCacheStats.configCacheSize,
          },
          timestamp: Date.now(),
        },
      };
    } catch (error: any) {
      logger.error(
        'Error generating performance report',
        error,
        {},
        ErrorCategory.AGENT,
        ErrorSeverity.MEDIUM,
        true
      );
      return { success: false, error: error.message };
    }
  });

  logger.info('Performance optimization handlers registered');
}
