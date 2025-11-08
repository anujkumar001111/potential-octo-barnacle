/**
 * Response formatting utilities for Advanced Browser Tools
 *
 * Provides consistent response formatting across all tools.
 */

import type { ToolSuccessResponse, ToolMetadata } from './types';

export class ResponseFormatter {
  /**
   * Maximum response size before automatic file saving (1MB)
   */
  private static readonly MAX_RESPONSE_SIZE = 1024 * 1024;

  /**
   * Create a success response
   *
   * @param data - Response data
   * @param metadata - Optional metadata
   * @returns Formatted success response
   */
  static success<T>(data: T, metadata?: ToolMetadata): ToolSuccessResponse<T> {
    const response: ToolSuccessResponse<T> = {
      success: true,
      data
    };

    if (metadata) {
      response.metadata = {
        ...metadata,
        timestamp: metadata.timestamp || new Date().toISOString()
      };
    }

    return response;
  }

  /**
   * Check if response data is too large
   *
   * @param data - Data to check
   * @returns True if data exceeds size limit
   */
  static isResponseTooLarge(data: any): boolean {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length > this.MAX_RESPONSE_SIZE;
    } catch (error) {
      // If we can't stringify, assume it's too large
      return true;
    }
  }

  /**
   * Get response size in bytes
   *
   * @param data - Data to measure
   * @returns Size in bytes, or -1 if cannot measure
   */
  static getResponseSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return jsonString.length;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Format response size for display
   *
   * @param bytes - Size in bytes
   * @returns Formatted size string (e.g., "1.5 MB", "500 KB")
   */
  static formatSize(bytes: number): string {
    if (bytes < 0) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Create metadata object with common fields
   *
   * @param selector - CSS selector used
   * @param url - Page URL
   * @param executionTimeMs - Execution time in milliseconds
   * @param additional - Additional metadata fields
   * @returns Metadata object
   */
  static createMetadata(
    selector?: string,
    url?: string,
    executionTimeMs?: number,
    additional?: Record<string, any>
  ): ToolMetadata {
    return {
      ...(selector && { selector }),
      ...(url && { url }),
      ...(executionTimeMs !== undefined && { execution_time_ms: executionTimeMs }),
      timestamp: new Date().toISOString(),
      ...additional
    };
  }

  /**
   * Truncate large strings in response data
   *
   * @param data - Data to truncate
   * @param maxLength - Maximum string length
   * @returns Truncated data
   */
  static truncateLargeStrings(data: any, maxLength: number = 1000): any {
    if (typeof data === 'string') {
      if (data.length > maxLength) {
        return data.substring(0, maxLength) + '... [truncated]';
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.truncateLargeStrings(item, maxLength));
    }

    if (data && typeof data === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.truncateLargeStrings(value, maxLength);
      }
      return result;
    }

    return data;
  }

  /**
   * Create a file-saved response when data is too large
   *
   * @param filePath - Path to saved file
   * @param fileSize - File size in bytes
   * @param originalMetadata - Original metadata
   * @returns Response indicating data was saved to file
   */
  static createFileSavedResponse(
    filePath: string,
    fileSize: number,
    originalMetadata?: ToolMetadata
  ): ToolSuccessResponse<any> {
    return this.success(
      {
        saved_to_file: true,
        file_path: filePath,
        file_size: this.formatSize(fileSize),
        file_size_bytes: fileSize,
        message: 'Response too large, saved to file'
      },
      originalMetadata
    );
  }
}