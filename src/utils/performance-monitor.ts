/**
 * Performance monitoring utilities
 * Helps identify memory leaks and performance bottlenecks
 */

export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();

  /**
   * Start measuring performance
   */
  static start(label: string): void {
    this.measurements.set(label, performance.now());
  }

  /**
   * End measurement and log result
   */
  static end(label: string): number {
    const start = this.measurements.get(label);
    if (!start) {
      console.warn(`[Performance] No start time found for: ${label}`);
      return 0;
    }

    const duration = performance.now() - start;
    this.measurements.delete(label);

    if (duration > 1000) {
      console.warn(`[Performance] Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.log(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Monitor memory usage (browser only)
   */
  static getMemoryUsage(): { used: number; total: number } | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    };
  }

  /**
   * Log memory usage
   */
  static logMemory(label: string = 'Memory'): void {
    const memory = this.getMemoryUsage();
    if (memory) {
      console.log(`[${label}] ${memory.used}MB / ${memory.total}MB (${Math.round((memory.used / memory.total) * 100)}%)`);
    }
  }
}

// Auto-log memory every 30 seconds in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  setInterval(() => {
    PerformanceMonitor.logMemory('Auto');
  }, 30000);
}
