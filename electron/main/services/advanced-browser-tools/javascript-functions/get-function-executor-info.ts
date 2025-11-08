/**
 * Get Function Executor Info Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { ResponseFormatter, handleToolError } from '../shared';

export const getFunctionExecutorInfoTool: Tool = {
  name: 'get_function_executor_info',
  description: 'Get information about the function executor system. Returns status and capabilities.',
  parameters: {
    type: 'object',
    properties: {
      instance_id: { type: 'string', description: 'Optional instance ID' }
    }
  },
  execute: async (_args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    try {
      const result = await (agentContext.agent as any).execute_script(agentContext,
        agentContext,
        () => {
          return {
            status: 'active',
            capabilities: ['function_discovery', 'function_execution', 'script_injection'],
            version: '1.0.0',
            context: 'main',
            url: window.location.href
          };
        },
        []
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