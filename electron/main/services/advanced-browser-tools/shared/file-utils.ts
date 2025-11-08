/**
 * File I/O utilities for Advanced Browser Tools
 *
 * Handles file operations like saving extraction results, creating directories,
 * and managing file paths.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AdvancedToolError, AdvancedToolErrorCode } from './error-codes';
import type { FileOperationResult } from './types';

export class FileUtils {
  /**
   * Default output directory for saved files
   */
  private static readonly DEFAULT_OUTPUT_DIR = './advanced-browser-tools-output';

  /**
   * Ensure a directory exists, creating it if necessary
   *
   * @param dirPath - Directory path
   * @throws {AdvancedToolError} If directory cannot be created
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.DIRECTORY_CREATE_ERROR,
        `Failed to create directory: ${error.message}`,
        { dirPath, originalError: error.message }
      );
    }
  }

  /**
   * Generate a unique filename with timestamp
   *
   * @param prefix - Filename prefix
   * @param selector - CSS selector (will be sanitized)
   * @param extension - File extension (default: 'json')
   * @returns Unique filename
   */
  static generateFilename(
    prefix: string,
    selector?: string,
    extension: string = 'json'
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedSelector = selector
      ? this.sanitizeFilename(selector)
      : '';

    const parts = [prefix];
    if (sanitizedSelector) {
      parts.push(sanitizedSelector);
    }
    parts.push(timestamp);

    return `${parts.join('_')}.${extension}`;
  }

  /**
   * Sanitize a string for use in filename
   *
   * @param str - String to sanitize
   * @returns Sanitized string safe for filename
   */
  static sanitizeFilename(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')             // Replace multiple underscores with single
      .substring(0, 50);               // Limit length
  }

  /**
   * Save data to a JSON file
   *
   * @param data - Data to save
   * @param filename - Filename
   * @param outputDir - Output directory (optional)
   * @returns File operation result
   * @throws {AdvancedToolError} If file cannot be written
   */
  static async saveToJsonFile(
    data: any,
    filename: string,
    outputDir?: string
  ): Promise<FileOperationResult> {
    const dir = outputDir || this.DEFAULT_OUTPUT_DIR;

    // Ensure directory exists
    await this.ensureDirectory(dir);

    // Create full file path
    const filepath = path.join(dir, filename);

    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data, null, 2);

      // Write to file
      await fs.writeFile(filepath, jsonString, 'utf-8');

      // Get file stats
      const stats = await fs.stat(filepath);

      return {
        file_path: path.resolve(filepath),
        file_size_kb: Math.round(stats.size / 1024),
        filename,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.FILE_WRITE_ERROR,
        `Failed to write file: ${error.message}`,
        { filepath, originalError: error.message }
      );
    }
  }

  /**
   * Read data from a JSON file
   *
   * @param filepath - File path
   * @returns Parsed JSON data
   * @throws {AdvancedToolError} If file cannot be read
   */
  static async readJsonFile(filepath: string): Promise<any> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.FILE_READ_ERROR,
        `Failed to read file: ${error.message}`,
        { filepath, originalError: error.message }
      );
    }
  }

  /**
   * Check if a file exists
   *
   * @param filepath - File path
   * @returns True if file exists
   */
  static async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size in bytes
   *
   * @param filepath - File path
   * @returns File size in bytes
   * @throws {AdvancedToolError} If file cannot be accessed
   */
  static async getFileSize(filepath: string): Promise<number> {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.FILE_READ_ERROR,
        `Failed to get file size: ${error.message}`,
        { filepath, originalError: error.message }
      );
    }
  }

  /**
   * Delete a file
   *
   * @param filepath - File path
   * @throws {AdvancedToolError} If file cannot be deleted
   */
  static async deleteFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.FILE_WRITE_ERROR,
        `Failed to delete file: ${error.message}`,
        { filepath, originalError: error.message }
      );
    }
  }

  /**
   * List files in a directory
   *
   * @param dirPath - Directory path
   * @param extension - Filter by extension (optional)
   * @returns Array of filenames
   * @throws {AdvancedToolError} If directory cannot be read
   */
  static async listFiles(
    dirPath: string,
    extension?: string
  ): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);

      if (extension) {
        return files.filter(file => file.endsWith(`.${extension}`));
      }

      return files;
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.FILE_READ_ERROR,
        `Failed to list files: ${error.message}`,
        { dirPath, originalError: error.message }
      );
    }
  }

  /**
   * Clean up old files in a directory
   *
   * @param dirPath - Directory path
   * @param maxAgeHours - Maximum age in hours
   * @returns Number of files deleted
   */
  static async cleanupOldFiles(
    dirPath: string,
    maxAgeHours: number = 24
  ): Promise<number> {
    try {
      const files = await fs.readdir(dirPath);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(dirPath, file);
        const stats = await fs.stat(filepath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error: any) {
      throw new AdvancedToolError(
        AdvancedToolErrorCode.FILE_WRITE_ERROR,
        `Failed to cleanup files: ${error.message}`,
        { dirPath, originalError: error.message }
      );
    }
  }
}