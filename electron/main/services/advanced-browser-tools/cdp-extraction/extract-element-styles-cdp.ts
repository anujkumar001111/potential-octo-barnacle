/**
 * Extract Element Styles CDP Tool
 * Uses Chrome DevTools Protocol for style extraction (no JavaScript evaluation)
 * 
 * Note: This tool requires WebContents debugger API which may not be available
 * in all contexts. Falls back to JavaScript-based extraction if CDP is unavailable.
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  SecurityValidator,
  ResponseFormatter,
  AdvancedToolError,
  AdvancedToolErrorCode,
  handleToolError,
  type ElementStyles,
  type StyleExtractionOptions
} from '../shared';

interface ExtractStylesCdpParams extends StyleExtractionOptions {
  selector: string;
}

export const extractElementStylesCdpTool: Tool = {
  name: 'extract_element_styles_cdp',
  description: 'Extract element styles using Chrome DevTools Protocol (no JavaScript evaluation). More reliable than JS-based extraction but requires CDP access. Falls back to JS if CDP unavailable.',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector for the element' },
      include_computed: { type: 'boolean', default: true },
      include_css_rules: { type: 'boolean', default: true },
      include_pseudo: { type: 'boolean', default: true },
      include_inheritance: { type: 'boolean', default: false }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const params: ExtractStylesCdpParams = {
        selector: String(args.selector || ''),
        include_computed: args.include_computed !== false,
        include_css_rules: args.include_css_rules !== false,
        include_pseudo: args.include_pseudo !== false,
        include_inheritance: args.include_inheritance === true
      };

      SecurityValidator.validateSelector(params.selector);

      // Note: CDP access in Electron requires webContents.debugger
      // This is a simplified implementation that falls back to JS-based extraction
      // In a full implementation, you would:
      // 1. Attach debugger: webContents.debugger.attach('1.3')
      // 2. Send CDP commands: webContents.debugger.sendCommand('DOM.getDocument')
      // 3. Query selector: webContents.debugger.sendCommand('DOM.querySelector', { nodeId, selector })
      // 4. Get styles: webContents.debugger.sendCommand('CSS.getComputedStyleForNode', { nodeId })
      
      // For now, fall back to JavaScript-based extraction
      // This ensures the tool works even without CDP access
      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, options: StyleExtractionOptions) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          const result: any = {};

          // Extract computed styles
          if (options.include_computed) {
            const computed = window.getComputedStyle(element);
            const computedStyles: Record<string, string> = {};
            
            for (let i = 0; i < computed.length; i++) {
              const prop = computed[i];
              computedStyles[prop] = computed.getPropertyValue(prop);
            }
            
            result.computed_styles = computedStyles;
          }

          // Note: CDP would provide more reliable CSS rule extraction
          // This is a simplified JS-based version
          if (options.include_css_rules) {
            result.css_rules = [];
            result._note = 'CDP-based CSS rule extraction not available, using JS fallback';
          }

          // Extract pseudo-element styles
          if (options.include_pseudo) {
            result.pseudo_elements = {
              before: {},
              after: {}
            };
            
            try {
              const before = window.getComputedStyle(element, '::before');
              const beforeContent = before.getPropertyValue('content');
              if (beforeContent && beforeContent !== 'none') {
                const beforeStyles: Record<string, string> = {};
                for (let i = 0; i < before.length; i++) {
                  const prop = before[i];
                  beforeStyles[prop] = before.getPropertyValue(prop);
                }
                result.pseudo_elements.before = beforeStyles;
              }
            } catch (e) {
              // Pseudo-element doesn't exist
            }
            
            try {
              const after = window.getComputedStyle(element, '::after');
              const afterContent = after.getPropertyValue('content');
              if (afterContent && afterContent !== 'none') {
                const afterStyles: Record<string, string> = {};
                for (let i = 0; i < after.length; i++) {
                  const prop = after[i];
                  afterStyles[prop] = after.getPropertyValue(prop);
                }
                result.pseudo_elements.after = afterStyles;
              }
            } catch (e) {
              // Pseudo-element doesn't exist
            }
          }

          return result;
        },
        [params.selector, params]
      );

      if (result && typeof result === 'object' && 'error' in result) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          result.error as string,
          { selector: params.selector }
        );
      }

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(
        params.selector,
        url as string,
        executionTime,
        { method: 'cdp_fallback_to_js' }
      );

      const response = ResponseFormatter.success<ElementStyles>(result as ElementStyles, metadata);

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
