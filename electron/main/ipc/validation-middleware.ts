/**
 * ✅ SECURITY FIX: IPC Validation Middleware
 *
 * This middleware validates all IPC messages from renderer processes
 * using Zod schemas. It prevents injection attacks, DoS, and data corruption
 * by enforcing strict type checking and validation rules.
 *
 * @module validation-middleware
 */

import { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import log from 'electron-log';

/**
 * Creates a validated IPC handler that enforces schema validation
 *
 * @param schema - Zod schema to validate against
 * @param handler - The actual handler function that processes validated data
 * @returns Wrapped handler with automatic validation
 *
 * @example
 * ```typescript
 * ipcMain.handle('eko:run', validateIpc(EkoRunSchema)(
 *   async (event, data) => {
 *     // data is automatically typed and validated
 *     return await ekoService.run(data.message);
 *   }
 * ));
 * ```
 */
export function validateIpc<T extends z.ZodSchema>(schema: T) {
  return function(
    handler: (event: IpcMainInvokeEvent, data: z.infer<T>) => Promise<any>
  ) {
    return async (event: IpcMainInvokeEvent, ...rawArgs: unknown[]): Promise<any> => {
      const senderId = event.sender.id;
      const channel = event.frameId; // Use frameId as unique identifier

      try {
        // Parse and validate the first argument (most IPC handlers take a single object argument)
        const rawData = rawArgs.length === 1 ? rawArgs[0] : rawArgs;

        const result = schema.safeParse(rawData);

        if (!result.success) {
          const errorDetails = result.error.format();

          log.warn('[IPC Validation Failed]', {
            senderId,
            channel,
            errors: errorDetails,
            receivedData: rawData
          });

          // Return detailed error for development, generic error for production
          const isDev = process.env.NODE_ENV === 'development';
          throw new Error(
            isDev
              ? `Invalid IPC request: ${JSON.stringify(errorDetails, null, 2)}`
              : 'Invalid request format'
          );
        }

        // Call the original handler with validated data
        return await handler(event, result.data);

      } catch (error: any) {
        log.error('[IPC Handler Error]', {
          senderId,
          channel,
          error: error.message,
          stack: error.stack
        });

        // Re-throw to let Electron handle the error
        throw error;
      }
    };
  };
}

/**
 * Creates a validated IPC handler for multiple arguments
 * Use this when your IPC handler takes multiple separate arguments instead of a single object
 *
 * @param schemas - Array of Zod schemas, one for each argument
 * @param handler - The actual handler function that processes validated data
 * @returns Wrapped handler with automatic validation
 *
 * @example
 * ```typescript
 * ipcMain.handle('eko:modify', validateIpcArgs([z.string(), z.string()])(
 *   async (event, taskId, message) => {
 *     return await ekoService.modify(taskId, message);
 *   }
 * ));
 * ```
 */
export function validateIpcArgs<T extends z.ZodSchema[]>(schemas: T) {
  return function(
    handler: (event: IpcMainInvokeEvent, ...data: {
      [K in keyof T]: z.infer<T[K]>
    }) => Promise<any>
  ) {
    return async (event: IpcMainInvokeEvent, ...rawArgs: unknown[]): Promise<any> => {
      const senderId = event.sender.id;

      try {
        // Validate each argument against its corresponding schema
        if (rawArgs.length !== schemas.length) {
          throw new Error(
            `Expected ${schemas.length} arguments, but received ${rawArgs.length}`
          );
        }

        const validatedArgs: any[] = [];
        for (let i = 0; i < schemas.length; i++) {
          const result = schemas[i].safeParse(rawArgs[i]);

          if (!result.success) {
            log.warn('[IPC Validation Failed]', {
              senderId,
              argumentIndex: i,
              errors: result.error.format(),
              receivedData: rawArgs[i]
            });

            throw new Error(
              `Invalid argument at position ${i}: ${result.error.message}`
            );
          }

          validatedArgs.push(result.data);
        }

        // Call the original handler with validated arguments
        return await handler(event, ...validatedArgs as any);

      } catch (error: any) {
        log.error('[IPC Handler Error]', {
          senderId,
          error: error.message
        });

        throw error;
      }
    };
  };
}

/**
 * Rate limiting middleware to prevent DoS attacks
 *
 * @param maxCalls - Maximum number of calls allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * ipcMain.handle('eko:run',
 *   rateLimit(10, 1000)( // Max 10 calls per second
 *     validateIpc(EkoRunSchema)(...)
 *   )
 * );
 * ```
 */
export function rateLimit(maxCalls: number, windowMs: number) {
  const rateLimits = new Map<number, { count: number; resetAt: number }>();

  return function(handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>) {
    return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<any> => {
      const senderId = event.sender.id;
      const now = Date.now();
      const limit = rateLimits.get(senderId);

      if (limit && now < limit.resetAt) {
        if (limit.count >= maxCalls) {
          log.warn('[Rate Limit Exceeded]', {
            senderId,
            maxCalls,
            windowMs
          });

          throw new Error('Rate limit exceeded. Please try again later.');
        }
        limit.count++;
      } else {
        rateLimits.set(senderId, { count: 1, resetAt: now + windowMs });
      }

      return await handler(event, ...args);
    };
  };
}
