/**
 * List CDP Commands Tool
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { ResponseFormatter, handleToolError, type CDPCommand } from '../shared';

export const listCdpCommandsTool: Tool = {
  name: 'list_cdp_commands',
  description: 'List available Chrome DevTools Protocol commands. Returns domains and command names.',
  parameters: { type: 'object', properties: {} },
  execute: async (_args: Record<string, unknown>, _agentContext: AgentContext): Promise<ToolResult> => {
    try {
      // Return a subset of common CDP commands
      const commands: CDPCommand[] = [
        { domain: 'Page', name: 'navigate', parameters: [{ name: 'url', type: 'string' }] },
        { domain: 'Page', name: 'reload', parameters: [] },
        { domain: 'DOM', name: 'getDocument', parameters: [] },
        { domain: 'DOM', name: 'querySelector', parameters: [{ name: 'nodeId', type: 'number' }, { name: 'selector', type: 'string' }] },
        { domain: 'CSS', name: 'getComputedStyleForNode', parameters: [{ name: 'nodeId', type: 'number' }] },
        { domain: 'CSS', name: 'getMatchedStylesForNode', parameters: [{ name: 'nodeId', type: 'number' }] },
        { domain: 'Runtime', name: 'evaluate', parameters: [{ name: 'expression', type: 'string' }] },
        { domain: 'Network', name: 'enable', parameters: [] },
        { domain: 'Network', name: 'disable', parameters: [] }
      ];

      const response = ResponseFormatter.success<CDPCommand[]>(commands);
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