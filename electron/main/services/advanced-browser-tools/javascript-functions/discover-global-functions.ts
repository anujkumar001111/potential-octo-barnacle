/**
 * Discover Global Functions Tool
 * Discovers all global JavaScript functions available in window
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { ResponseFormatter, handleToolError, type FunctionInfo } from '../shared';

export const discoverGlobalFunctionsTool: Tool = {
  name: 'discover_global_functions',
  description: 'Discover all global JavaScript functions available in window. Returns function names, parameter counts, and whether they are async. Useful for finding available page APIs.',
  parameters: {
    type: 'object',
    properties: {
      include_built_in: { type: 'boolean', default: false, description: 'Include built-in browser functions' },
      filter_pattern: { type: 'string', description: 'Regex pattern to filter function names' }
    }
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const includeBuiltIn = args.include_built_in === true;
      const filterPattern = args.filter_pattern as string | undefined;

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (includeBuiltIn: boolean, filterPattern?: string) => {
          const functions: any[] = [];
          const builtInFunctions = new Set([
            'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
            'fetch', 'XMLHttpRequest', 'addEventListener', 'removeEventListener', 'requestAnimationFrame',
            'cancelAnimationFrame', 'atob', 'btoa', 'eval', 'Function', 'parseInt', 'parseFloat'
          ]);

          for (const key in window) {
            try {
              if (typeof (window as any)[key] === 'function') {
                if (!includeBuiltIn && builtInFunctions.has(key)) continue;
                if (filterPattern && !new RegExp(filterPattern).test(key)) continue;

                const fn = (window as any)[key];
                functions.push({
                  name: key,
                  parameters: fn.length,
                  is_async: fn.constructor.name === 'AsyncFunction',
                  source: fn.toString().substring(0, 200)
                });
              }
            } catch (e) {
              // Skip functions that throw on access
            }
          }

          return functions;
        },
        [includeBuiltIn, filterPattern]
      );

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(undefined, url as string, executionTime, {
        count: Array.isArray(result) ? result.length : 0
      });

      const response = ResponseFormatter.success<FunctionInfo[]>(result as FunctionInfo[], metadata);

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
