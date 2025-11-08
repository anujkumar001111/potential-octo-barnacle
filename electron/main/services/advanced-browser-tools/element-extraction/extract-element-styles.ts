/**
 * Extract Element Styles Tool
 * 
 * Extracts complete CSS styling information from an element including:
 * - Computed styles (final CSS values after cascade)
 * - CSS rules (matching rules from stylesheets)
 * - Pseudo-element styles (::before, ::after, etc.)
 * - Style inheritance chain (optional)
 * 
 * @priority HIGH
 * @complexity MEDIUM
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
  type ElementStyles,
  type StyleExtractionOptions
} from '../shared';

interface ExtractStylesParams extends StyleExtractionOptions {
  selector: string;
}

export const extractElementStylesTool: Tool = {
  name: 'extract_element_styles',
  description: 'Extract complete CSS styling information from an element. Returns computed styles, CSS rules, pseudo-element styles, and optionally the inheritance chain. Useful for cloning UI components or analyzing design systems.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to extract styles from'
      },
      include_computed: {
        type: 'boolean',
        description: 'Include computed styles (final CSS values)',
        default: true
      },
      include_css_rules: {
        type: 'boolean',
        description: 'Include matching CSS rules from stylesheets',
        default: true
      },
      include_pseudo: {
        type: 'boolean',
        description: 'Include pseudo-element styles (::before, ::after)',
        default: true
      },
      include_inheritance: {
        type: 'boolean',
        description: 'Include style inheritance chain',
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
      const params: ExtractStylesParams = {
        selector: String(args.selector || ''),
        include_computed: args.include_computed !== false,
        include_css_rules: args.include_css_rules !== false,
        include_pseudo: args.include_pseudo !== false,
        include_inheritance: args.include_inheritance === true
      };

      // Validate selector
      SecurityValidator.validateSelector(params.selector);

      // Execute extraction script in page context
      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, options: StyleExtractionOptions) => {
          // Helper function to extract matching CSS rules
          function extractMatchingRules(element: Element): any[] {
            const rules: any[] = [];
            
            try {
              // Get all stylesheets
              const sheets = Array.from(document.styleSheets);
              
              for (const sheet of sheets) {
                try {
                  // Skip cross-origin stylesheets
                  const cssRules = sheet.cssRules || sheet.rules;
                  if (!cssRules) continue;
                  
                  for (let i = 0; i < cssRules.length; i++) {
                    const rule = cssRules[i] as CSSStyleRule;
                    
                    // Only process style rules
                    if (rule.type !== CSSRule.STYLE_RULE) continue;
                    
                    // Check if rule matches element
                    try {
                      if (element.matches(rule.selectorText)) {
                        const properties: Record<string, string> = {};
                        const style = rule.style;
                        
                        for (let j = 0; j < style.length; j++) {
                          const prop = style[j];
                          properties[prop] = style.getPropertyValue(prop);
                        }
                        
                        rules.push({
                          selector: rule.selectorText,
                          properties,
                          source: sheet.href || 'inline',
                          specificity: 0 // Simplified - would need proper calculation
                        });
                      }
                    } catch (e) {
                      // Skip invalid selectors
                    }
                  }
                } catch (e) {
                  // Skip inaccessible stylesheets (CORS)
                }
              }
            } catch (e) {
              console.error('Error extracting CSS rules:', e);
            }
            
            return rules;
          }

          // Helper function to extract pseudo-element styles
          function extractPseudoStyles(element: Element, pseudo: string): Record<string, string> {
            const styles: Record<string, string> = {};
            
            try {
              const computed = window.getComputedStyle(element, pseudo);
              
              // Only include if pseudo-element exists (has content)
              const content = computed.getPropertyValue('content');
              if (content && content !== 'none' && content !== 'normal') {
                for (let i = 0; i < computed.length; i++) {
                  const prop = computed[i];
                  styles[prop] = computed.getPropertyValue(prop);
                }
              }
            } catch (e) {
              console.error(`Error extracting ${pseudo} styles:`, e);
            }
            
            return styles;
          }

          // Helper function to extract inheritance chain
          function extractInheritanceChain(element: Element): any[] {
            const chain: any[] = [];
            let current: Element | null = element.parentElement;
            
            while (current) {
              const inherited: string[] = [];
              const computed = window.getComputedStyle(current);
              
              // Common inherited properties
              const inheritedProps = [
                'color', 'font-family', 'font-size', 'font-weight', 'font-style',
                'line-height', 'text-align', 'text-transform', 'letter-spacing',
                'word-spacing', 'white-space', 'direction', 'visibility'
              ];
              
              for (const prop of inheritedProps) {
                const value = computed.getPropertyValue(prop);
                if (value) {
                  inherited.push(prop);
                }
              }
              
              if (inherited.length > 0) {
                chain.push({
                  element: current.tagName.toLowerCase() + 
                    (current.id ? `#${current.id}` : '') +
                    (current.className ? `.${Array.from(current.classList).join('.')}` : ''),
                  inherited_properties: inherited
                });
              }
              
              current = current.parentElement;
            }
            
            return chain;
          }

          // Main extraction logic
          const element = document.querySelector(selector);
          if (!element) {
            return { error: 'Element not found', selector };
          }

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

          // Extract CSS rules
          if (options.include_css_rules) {
            result.css_rules = extractMatchingRules(element);
          }

          // Extract pseudo-element styles
          if (options.include_pseudo) {
            result.pseudo_elements = {
              before: extractPseudoStyles(element, '::before'),
              after: extractPseudoStyles(element, '::after'),
              'first-letter': extractPseudoStyles(element, '::first-letter'),
              'first-line': extractPseudoStyles(element, '::first-line')
            };
          }

          // Extract inheritance chain
          if (options.include_inheritance) {
            result.inheritance_chain = extractInheritanceChain(element);
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

      const response = ResponseFormatter.success<ElementStyles>(result as ElementStyles, metadata);

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
