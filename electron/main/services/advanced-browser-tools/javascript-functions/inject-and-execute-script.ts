/**
 * Inject and Execute Script Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { SecurityValidator, ResponseFormatter, handleToolError } from '../shared';

export const injectAndExecuteScriptTool: Tool = {
  name: 'inject_and_execute_script',
  description: 'Inject and execute JavaScript code in the page context. Returns the result.',
  parameters: {
    type: 'object',
    properties: {
      script_code: { type: 'string', description: 'JavaScript code to execute' },
      timeout: { type: 'number', default: 30000 }
    },
    required: ['script_code']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    try {
      const scriptCode = String(args.script_code || '');
      const timeout = Number(args.timeout) || 30000;

      SecurityValidator.validateJavaScriptCode(scriptCode);
      SecurityValidator.validateTimeout(timeout);

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (scriptCode: string) => eval(scriptCode),
        [scriptCode]
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
