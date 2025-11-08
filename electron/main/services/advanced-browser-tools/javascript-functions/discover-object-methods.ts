/**
 * Discover Object Methods Tool
 * Discovers methods available on a JavaScript object
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import { SecurityValidator, ResponseFormatter, handleToolError, type FunctionInfo } from '../shared';

export const discoverObjectMethodsTool: Tool = {
  name: 'discover_object_methods',
  description: 'Discover methods available on a JavaScript object. Returns method names and signatures. Useful for exploring object APIs.',
  parameters: {
    type: 'object',
    properties: {
      object_path: { type: 'string', description: 'Path to object (e.g., "document", "window.myObject")' }
    },
    required: ['object_path']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const objectPath = String(args.object_path || '');
      SecurityValidator.validateFunctionPath(objectPath);

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (objectPath: string) => {
          const obj = eval(objectPath);
          if (!obj || typeof obj !== 'object') {
            return { error: 'Object not found or not an object', objectPath };
          }

          const methods: any[] = [];
          const proto = Object.getPrototypeOf(obj);
          const allProps = new Set([...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertyNames(proto)]);

          allProps.forEach(prop => {
            try {
              if (typeof obj[prop] === 'function') {
                methods.push({
                  name: prop,
                  parameters: obj[prop].length,
                  is_async: obj[prop].constructor.name === 'AsyncFunction',
                  source: obj[prop].toString().substring(0, 200)
                });
              }
            } catch (e) {
              // Skip inaccessible methods
            }
          });

          return methods;
        },
        [objectPath]
      );

      if (result && typeof result === 'object' && 'error' in result) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: result.error }, null, 2) }],
          isError: true
        };
      }

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(undefined, url as string, executionTime);
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
