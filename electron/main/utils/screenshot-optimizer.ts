/**
 * Screenshot Optimizer
 * Handles dynamic scaling, format optimization, and quality management
 *
 * Features:
 * - Automatic resolution scaling based on use case
 * - Format selection (WebP vs JPEG) based on content
 * - Quality adaptation based on memory pressure
 * - Responsive scaling for different device types
 */

import sharp from 'sharp';
import { createLogger } from './logger';
import { ErrorCategory, ErrorSeverity } from './error-handler';

const logger = createLogger('ScreenshotOptimizer');

export enum ScreenshotUseCase {
  DISPLAY = 'display',         // Full quality for UI display
  ANALYSIS = 'analysis',       // Medium quality for AI analysis
  THUMBNAIL = 'thumbnail',     // Low quality for preview
  ARCHIVE = 'archive',         // Maximum compression for storage
}

interface OptimizationProfile {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'auto';
}

interface OptimizedResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

export class ScreenshotOptimizer {
  private profiles: Map<ScreenshotUseCase, OptimizationProfile> = new Map([
    [ScreenshotUseCase.DISPLAY, { maxWidth: 1920, maxHeight: 1080, quality: 90, format: 'webp' }],
    [ScreenshotUseCase.ANALYSIS, { maxWidth: 1280, maxHeight: 720, quality: 75, format: 'webp' }],
    [ScreenshotUseCase.THUMBNAIL, { maxWidth: 320, maxHeight: 180, quality: 60, format: 'jpeg' }],
    [ScreenshotUseCase.ARCHIVE, { maxWidth: 800, maxHeight: 600, quality: 50, format: 'webp' }],
  ]);

  private memoryPressure: number = 0; // 0-1 scale

  /**
   * Optimize screenshot based on use case
   */
  async optimize(
    buffer: Buffer,
    useCase: ScreenshotUseCase = ScreenshotUseCase.ANALYSIS
  ): Promise<OptimizedResult> {
    try {
      const profile = this.getAdaptiveProfile(useCase);

      // Detect image metadata
      const metadata = await this.getImageMetadata(buffer);

      // Scale image
      let pipeline = sharp(buffer);
      const scaledWidth = Math.min(metadata.width!, profile.maxWidth);
      const scaledHeight = Math.min(metadata.height!, profile.maxHeight);

      if (scaledWidth < metadata.width! || scaledHeight < metadata.height!) {
        pipeline = pipeline.resize(scaledWidth, scaledHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Select format based on content
      const format = profile.format === 'auto'
        ? this.selectOptimalFormat(metadata)
        : profile.format;

      // Apply format-specific optimization
      let optimized: Buffer;
      if (format === 'webp') {
        optimized = await pipeline
          .webp({ quality: profile.quality, alphaQuality: profile.quality })
          .toBuffer();
      } else {
        optimized = await pipeline
          .jpeg({ quality: profile.quality, progressive: true })
          .toBuffer();
      }

      const compressionRatio = buffer.length > 0 ? optimized.length / buffer.length : 1;

      logger.debug('Screenshot optimized', {
        useCase,
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        compressionRatio: (compressionRatio * 100).toFixed(1) + '%',
        scaledDimensions: `${scaledWidth}x${scaledHeight}`,
        format,
      });

      return {
        buffer: optimized,
        width: scaledWidth,
        height: scaledHeight,
        format,
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        compressionRatio,
      };
    } catch (error: any) {
      logger.error(
        'Screenshot optimization failed',
        error,
        { useCase, bufferSize: buffer.length },
        ErrorCategory.STORAGE,
        ErrorSeverity.MEDIUM,
        true
      );
      // Return original if optimization fails
      return {
        buffer,
        width: 0,
        height: 0,
        format: 'unknown',
        originalSize: buffer.length,
        optimizedSize: buffer.length,
        compressionRatio: 1,
      };
    }
  }

  /**
   * Get adaptive profile based on memory pressure
   */
  private getAdaptiveProfile(useCase: ScreenshotUseCase): OptimizationProfile {
    let profile = this.profiles.get(useCase)!;

    // Under memory pressure, reduce quality and resolution
    if (this.memoryPressure > 0.8) {
      return {
        ...profile,
        maxWidth: Math.floor(profile.maxWidth * 0.7),
        maxHeight: Math.floor(profile.maxHeight * 0.7),
        quality: Math.max(40, profile.quality - 20),
      };
    }

    if (this.memoryPressure > 0.5) {
      return {
        ...profile,
        maxWidth: Math.floor(profile.maxWidth * 0.85),
        maxHeight: Math.floor(profile.maxHeight * 0.85),
        quality: Math.max(50, profile.quality - 10),
      };
    }

    return profile;
  }

  /**
   * Select optimal format based on image content
   */
  private selectOptimalFormat(metadata: sharp.Metadata): 'webp' | 'jpeg' {
    // WebP if has transparency or when content is complex
    if (metadata.hasAlpha) {
      return 'webp';
    }

    // JPEG for simple content to reduce size further
    return 'jpeg';
  }

  /**
   * Get image metadata
   */
  private async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    return sharp(buffer).metadata();
  }

  /**
   * Update memory pressure (call from memory monitor)
   */
  setMemoryPressure(pressure: number): void {
    this.memoryPressure = Math.max(0, Math.min(1, pressure));

    if (this.memoryPressure > 0.7) {
      logger.warn('High memory pressure detected', { pressure: this.memoryPressure });
    }
  }

  /**
   * Batch optimize multiple screenshots
   */
  async optimizeBatch(
    buffers: Buffer[],
    useCase: ScreenshotUseCase = ScreenshotUseCase.ANALYSIS
  ): Promise<OptimizedResult[]> {
    const results = await Promise.all(
      buffers.map(buffer => this.optimize(buffer, useCase))
    );

    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0);

    logger.info('Batch optimization completed', {
      count: buffers.length,
      totalOriginal,
      totalOptimized,
      averageCompressionRatio: (totalOptimized / totalOriginal * 100).toFixed(1) + '%',
    });

    return results;
  }

  /**
   * Create custom profile
   */
  createCustomProfile(
    useCase: ScreenshotUseCase,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): void {
    this.profiles.set(useCase, { maxWidth, maxHeight, quality, format: 'auto' });
    logger.info('Custom optimization profile created', { useCase, maxWidth, maxHeight, quality });
  }
}

// Singleton instance
export const screenshotOptimizer = new ScreenshotOptimizer();
