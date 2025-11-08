/**
 * Get Execution Contexts Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { ResponseFormatter, handleToolError, type ExecutionContext } from '../shared';

export const getExecutionContextsTool: Tool = {
  name: 'get_execution_contexts',
  description: 'Get available execution contexts (main, iframes, workers). Returns context IDs and types.',
  parameters: { type: 'object', properties: {} },
  execute: async (_args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    try {
      const result = await (agentContext.agent as any).execute_script(agentContext,
        agentContext,
        () => {
          const contexts: any[] = [];

          // Main context
          contexts.push({
            id: 'main',
            type: 'main',
            url: window.location.href,
            is_active: true
          });

          // Iframes
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach((iframe, index) => {
            try {
              contexts.push({
                id: `iframe-${index}`,
                type: 'iframe',
                url: iframe.src || undefined,
                name: iframe.name || undefined,
                is_active: false
              });
            } catch (e) {
              // Cross-origin iframe
            }
          });

          return contexts;
        },
        []
      );

      const response = ResponseFormatter.success<ExecutionContext[]>(result as ExecutionContext[]);
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