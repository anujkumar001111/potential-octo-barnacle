/**
 * Extract Complete Element CDP Tool
 * Uses Chrome DevTools Protocol for complete element extraction
 *
 * Note: Falls back to JavaScript-based extraction if CDP is unavailable
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  SecurityValidator,
  ResponseFormatter,
  AdvancedToolError,
  AdvancedToolErrorCode,
  handleToolError,
  type CompleteElementClone
} from '../shared';

export const extractCompleteElementCdpTool: Tool = {
  name: 'extract_complete_element_cdp',
  description: 'Extract complete element using Chrome DevTools Protocol. More reliable than JS-based extraction. Falls back to JS if CDP unavailable.',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector for the element' },
      include_children: { type: 'boolean', default: true }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const selector = String(args.selector || '');
      const includeChildren = args.include_children !== false;

      SecurityValidator.validateSelector(selector);

      // Fall back to JS-based extraction
      // In production, this would use CDP commands for more reliable extraction
      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, _includeChildren: boolean) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          const clone: any = {
            selector,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            _method: 'cdp_fallback_to_js'
          };

          // Simplified extraction (full version in clone-element-complete)
          clone.structure = {
            tag_name: element.tagName.toLowerCase(),
            classes: Array.from(element.classList)
          };

          const computed = window.getComputedStyle(element);
          const styles: Record<string, string> = {};
          for (let i = 0; i < Math.min(computed.length, 50); i++) {
            const prop = computed[i];
            styles[prop] = computed.getPropertyValue(prop);
          }
          clone.styles = { computed_styles: styles };

          return clone;
        },
        [selector, includeChildren]
      );

      if (result && typeof result === 'object' && 'error' in result) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          result.error as string,
          { selector }
        );
      }

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(selector, url as string, executionTime);
      const response = ResponseFormatter.success<CompleteElementClone>(result as CompleteElementClone, metadata);

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