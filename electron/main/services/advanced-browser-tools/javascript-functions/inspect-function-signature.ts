/**
 * Inspect Function Signature Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { SecurityValidator, ResponseFormatter, handleToolError } from '../shared';

export const inspectFunctionSignatureTool: Tool = {
  name: 'inspect_function_signature',
  description: 'Inspect a JavaScript function signature. Returns parameter names, defaults, and documentation.',
  parameters: {
    type: 'object',
    properties: {
      function_path: { type: 'string', description: 'Path to function' }
    },
    required: ['function_path']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    try {
      const functionPath = String(args.function_path || '');
      SecurityValidator.validateFunctionPath(functionPath);

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (functionPath: string) => {
          const fn = eval(functionPath);
          if (typeof fn !== 'function') return { error: 'Not a function' };

          const source = fn.toString();
          const match = source.match(/\(([^)]*)\)/);
          const params = match ? match[1].split(',').map((p: any) => p.trim()).filter((p: any) => p) : [];

          return {
            name: fn.name || 'anonymous',
            parameters: params,
            parameter_count: fn.length,
            is_async: fn.constructor.name === 'AsyncFunction',
            source: source.substring(0, 500)
          };
        },
        [functionPath]
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