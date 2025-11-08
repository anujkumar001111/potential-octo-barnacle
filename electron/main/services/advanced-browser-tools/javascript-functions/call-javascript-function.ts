/**
 * Call JavaScript Function Tool
 * Calls an existing JavaScript function in the page context
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { SecurityValidator, ResponseFormatter, AdvancedToolErrorCode, AdvancedToolError, handleToolError } from '../shared';

export const callJavaScriptFunctionTool: Tool = {
  name: 'call_javascript_function',
  description: 'Call an existing JavaScript function in the page context. Pass arguments and get the result. Useful for using page APIs.',
  parameters: {
    type: 'object',
    properties: {
      function_path: { type: 'string', description: 'Path to function (e.g., "window.myFunction", "document.getElementById")' },
      args: { type: 'array', description: 'Arguments to pass to the function', items: {} },
      timeout: { type: 'number', default: 30000, description: 'Execution timeout in milliseconds' }
    },
    required: ['function_path']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const functionPath = String(args.function_path || '');
      const functionArgs = (args.args as any[]) || [];
      const timeout = Number(args.timeout) || 30000;

      SecurityValidator.validateFunctionPath(functionPath);

      // Execute the function call with timeout
      const result = await Promise.race([
        (agentContext.agent as any).execute_script(agentContext,
          agentContext,
          (path: string, ...args: any[]) => {
            try {
              // Navigate to the function using the path
              const pathParts = path.split('.');
              let obj = window as any;

              for (let i = 0; i < pathParts.length - 1; i++) {
                obj = obj[pathParts[i]];
                if (!obj) {
                  throw new Error(`Path not found: ${pathParts.slice(0, i + 1).join('.')}`);
                }
              }

              const functionName = pathParts[pathParts.length - 1];
              const func = obj[functionName];

              if (typeof func !== 'function') {
                throw new Error(`Not a function: ${path}`);
              }

              // Call the function
              const result = func.apply(obj, args);
              return { success: true, result };
            } catch (error: any) {
              return { success: false, error: error.message };
            }
          },
          [functionPath, ...functionArgs]
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Function call timeout')), timeout)
        )
      ]);

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(functionPath, url as string, executionTime, {
        function_path: functionPath,
        args_count: functionArgs.length,
        timeout
      });

      if (typeof result === 'object' && result !== null && 'success' in result) {
        if (!result.success) {
          throw new AdvancedToolError(
            AdvancedToolErrorCode.FUNCTION_EXECUTION_ERROR,
            result.error as string,
            { function_path: functionPath, args: functionArgs }
          );
        }

        const response = ResponseFormatter.success(result.result, metadata);
        return {
          content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }

      const response = ResponseFormatter.success(result, metadata);
      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
        isError: false
      };
    } catch (error: any) {
      const errorResponse = handleToolError(error);
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResponse, null, 2) }],
        isError: true
      };
    }
  }
};