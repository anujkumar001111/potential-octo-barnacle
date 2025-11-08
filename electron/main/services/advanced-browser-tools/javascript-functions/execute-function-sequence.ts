/**
 * Execute Function Sequence Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { ResponseFormatter, handleToolError } from '../shared';

export const executeFunctionSequenceTool: Tool = {
  name: 'execute_function_sequence',
  description: 'Execute multiple JavaScript functions in sequence. Stops on first error.',
  parameters: {
    type: 'object',
    properties: {
      function_calls: {
        type: 'array',
        description: 'Array of function call objects with path and args',
        items: { type: 'object' }
      }
    },
    required: ['function_calls']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    try {
      const functionCalls = (args.function_calls as any[]) || [];

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (functionCalls: any[]) => {
          const results: any[] = [];
          
          for (const call of functionCalls) {
            try {
              const fn = eval(call.function_path);
              if (typeof fn !== 'function') {
                return { error: `Not a function: ${call.function_path}`, results };
              }
              const result = fn(...(call.args || []));
              results.push({ success: true, result });
            } catch (error: any) {
              return { error: error.message, results, failed_at: call.function_path };
            }
          }
          
          return { success: true, results };
        },
        [functionCalls]
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
