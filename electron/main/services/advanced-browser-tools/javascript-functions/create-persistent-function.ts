/**
 * Create Persistent Function Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { SecurityValidator, ResponseFormatter, handleToolError } from '../shared';

export const createPersistentFunctionTool: Tool = {
  name: 'create_persistent_function',
  description: 'Create a persistent function in the page context. Makes the function available globally for reuse.',
  parameters: {
    type: 'object',
    properties: {
      function_name: { type: 'string', description: 'Name for the function' },
      function_code: { type: 'string', description: 'JavaScript code for the function' }
    },
    required: ['function_name', 'function_code']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    try {
      const functionName = String(args.function_name || '');
      const functionCode = String(args.function_code || '');

      SecurityValidator.validateFunctionPath(functionName);
      SecurityValidator.validateJavaScriptCode(functionCode);

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (functionName: string, functionCode: string) => {
          const existsBefore = typeof (window as any)[functionName] !== 'undefined';
          (window as any)[functionName] = eval(`(${functionCode})`);
          const existsAfter = typeof (window as any)[functionName] === 'function';

          return {
            success: existsAfter,
            function_name: functionName,
            overwritten: existsBefore,
            message: existsBefore ? 'Function created (overwrote existing)' : 'Function created'
          };
        },
        [functionName, functionCode]
      );

      const response = ResponseFormatter.success(result);
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
