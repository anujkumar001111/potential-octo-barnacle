/**
 * Extract Element Events Tool
 * 
 * Extracts all event listeners attached to an element including:
 * - Inline event handlers (onclick, onchange, etc.)
 * - addEventListener listeners
 * - Framework-specific event handlers (React, Vue, Angular, Svelte)
 * - Handler source code (optional)
 * 
 * @priority HIGH
 * @complexity HIGH
 * @risk LOW
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  SecurityValidator,
  ResponseFormatter,
  AdvancedToolError,
  AdvancedToolErrorCode,
  handleToolError,
  type ElementEvents,
  type EventExtractionOptions
} from '../shared';

interface ExtractEventsParams extends EventExtractionOptions {
  selector: string;
}

export const extractElementEventsTool: Tool = {
  name: 'extract_element_events',
  description: 'Extract all event listeners attached to an element. Returns inline handlers, addEventListener listeners, and framework-specific handlers. Useful for understanding element interactivity and behavior.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to extract events from'
      },
      include_inline: {
        type: 'boolean',
        description: 'Include inline event handlers (onclick, onchange, etc.)',
        default: true
      },
      include_listeners: {
        type: 'boolean',
        description: 'Include addEventListener attached listeners',
        default: true
      },
      include_framework: {
        type: 'boolean',
        description: 'Detect framework-specific event handlers (React, Vue, etc.)',
        default: true
      },
      analyze_handlers: {
        type: 'boolean',
        description: 'Include handler function source code (can be large)',
        default: false
      }
    },
    required: ['selector']
  },
  execute: async (
    args: Record<string, unknown>,
    agentContext: AgentContext
  ): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      // Parse and validate parameters
      const params: ExtractEventsParams = {
        selector: String(args.selector || ''),
        include_inline: args.include_inline !== false,
        include_listeners: args.include_listeners !== false,
        include_framework: args.include_framework !== false,
        analyze_handlers: args.analyze_handlers === true
      };

      // Validate selector
      SecurityValidator.validateSelector(params.selector);

      // Execute extraction script in page context
      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, options: EventExtractionOptions) => {
          // Helper function to extract inline event handlers
          function extractInlineHandlers(element: Element): Record<string, string> {
            const handlers: Record<string, string> = {};
            
            // Common event attributes
            const eventAttributes = [
              'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
              'onmouseout', 'onmousemove', 'onmouseenter', 'onmouseleave',
              'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
              'onchange', 'oninput', 'onsubmit', 'onreset', 'onselect',
              'onload', 'onerror', 'onabort', 'onscroll', 'onresize',
              'ondrag', 'ondrop', 'ondragstart', 'ondragend', 'ondragover',
              'ondragenter', 'ondragleave', 'ontouchstart', 'ontouchend',
              'ontouchmove', 'ontouchcancel'
            ];
            
            for (const attr of eventAttributes) {
              const value = element.getAttribute(attr);
              if (value) {
                handlers[attr] = value;
              }
            }
            
            return handlers;
          }

          // Helper function to detect framework-specific handlers
          function detectFrameworkHandlers(element: Element): any[] {
            const handlers: any[] = [];
            
            // Check for React
            const reactKeys = Object.keys(element).filter(key => 
              key.startsWith('__react') || key.startsWith('_react')
            );
            
            if (reactKeys.length > 0) {
              try {
                for (const key of reactKeys) {
                  const reactData = (element as any)[key];
                  if (reactData && reactData.memoizedProps) {
                    const props = reactData.memoizedProps;
                    for (const prop in props) {
                      if (prop.startsWith('on') && typeof props[prop] === 'function') {
                        handlers.push({
                          framework: 'react',
                          event_type: prop.substring(2).toLowerCase(),
                          handler_name: props[prop].name || 'anonymous'
                        });
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore React detection errors
              }
            }
            
            // Check for Vue
            if ((element as any).__vue__ || (element as any).__vueParentComponent) {
              try {
                const vueData = (element as any).__vue__ || (element as any).__vueParentComponent;
                if (vueData && vueData.$listeners) {
                  for (const event in vueData.$listeners) {
                    handlers.push({
                      framework: 'vue',
                      event_type: event,
                      handler_name: 'vue-handler'
                    });
                  }
                }
              } catch (e) {
                // Ignore Vue detection errors
              }
            }
            
            // Check for Angular
            if ((element as any).ng) {
              handlers.push({
                framework: 'angular',
                event_type: 'unknown',
                handler_name: 'angular-handler'
              });
            }
            
            // Check for Svelte
            const svelteKeys = Object.keys(element).filter(key => 
              key.startsWith('__svelte')
            );
            
            if (svelteKeys.length > 0) {
              handlers.push({
                framework: 'svelte',
                event_type: 'unknown',
                handler_name: 'svelte-handler'
              });
            }
            
            return handlers;
          }

          // Helper function to get event listeners (limited browser support)
          function getEventListeners(element: Element, analyzeHandlers: boolean): any[] {
            const listeners: any[] = [];
            
            // Note: getEventListeners is only available in Chrome DevTools
            // This is a best-effort approach
            if (typeof (window as any).getEventListeners === 'function') {
              try {
                const allListeners = (window as any).getEventListeners(element);
                
                for (const eventType in allListeners) {
                  const eventListeners = allListeners[eventType];
                  
                  for (const listener of eventListeners) {
                    listeners.push({
                      type: eventType,
                      handler: analyzeHandlers && listener.listener 
                        ? listener.listener.toString().substring(0, 500)
                        : '[Function]',
                      capture: listener.useCapture || false,
                      passive: listener.passive || false,
                      once: listener.once || false
                    });
                  }
                }
              } catch (e) {
                // getEventListeners not available or failed
              }
            }
            
            // Fallback: Check for common event properties
            if (listeners.length === 0) {
              const commonEvents = [
                'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover',
                'mouseout', 'keydown', 'keyup', 'keypress', 'focus', 'blur',
                'change', 'input', 'submit', 'load', 'error'
              ];
              
              for (const eventType of commonEvents) {
                const prop = `on${eventType}`;
                if ((element as any)[prop] && typeof (element as any)[prop] === 'function') {
                  listeners.push({
                    type: eventType,
                    handler: analyzeHandlers 
                      ? (element as any)[prop].toString().substring(0, 500)
                      : '[Function]',
                    capture: false,
                    passive: false,
                    once: false
                  });
                }
              }
            }
            
            return listeners;
          }

          // Main extraction logic
          const element = document.querySelector(selector);
          if (!element) {
            return { error: 'Element not found', selector };
          }

          const result: any = {};

          // Extract inline handlers
          if (options.include_inline) {
            result.inline_handlers = extractInlineHandlers(element);
          }

          // Extract event listeners
          if (options.include_listeners) {
            result.event_listeners = getEventListeners(element, options.analyze_handlers || false);
          }

          // Detect framework handlers
          if (options.include_framework) {
            result.framework_handlers = detectFrameworkHandlers(element);
          }

          return result;
        },
        [params.selector, params]
      );

      // Check for errors
      if (result && typeof result === 'object' && 'error' in result) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          result.error as string,
          { selector: params.selector }
        );
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Get current URL
      const url = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        () => window.location.href,
        []
      );

      // Format response
      const metadata = ResponseFormatter.createMetadata(
        params.selector,
        url as string,
        executionTime
      );

      const response = ResponseFormatter.success<ElementEvents>(result as ElementEvents, metadata);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }],
        isError: false
      };

    } catch (error: any) {
      const errorResponse = handleToolError(error);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2)
        }],
        isError: true
      };
    }
  }
};
