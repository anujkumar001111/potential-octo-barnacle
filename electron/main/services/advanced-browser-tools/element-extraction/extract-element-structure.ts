/**
 * Extract Element Structure Tool
 * 
 * Extracts complete HTML structure and DOM information from an element including:
 * - Tag name, ID, classes
 * - All attributes (including data-* attributes)
 * - Bounding box and position
 * - Child elements (with configurable depth)
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
  type ElementStructure,
  type StructureExtractionOptions
} from '../shared';

interface ExtractStructureParams extends StructureExtractionOptions {
  selector: string;
}

export const extractElementStructureTool: Tool = {
  name: 'extract_element_structure',
  description: 'Extract complete HTML structure and DOM information from an element. Returns tag name, attributes, position, and optionally child elements. Useful for understanding element hierarchy and recreating markup.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to extract structure from'
      },
      include_children: {
        type: 'boolean',
        description: 'Include child elements in the structure',
        default: false
      },
      include_attributes: {
        type: 'boolean',
        description: 'Include all element attributes',
        default: true
      },
      include_data_attributes: {
        type: 'boolean',
        description: 'Include data-* attributes separately',
        default: true
      },
      max_depth: {
        type: 'number',
        description: 'Maximum depth for child element extraction (1-10)',
        default: 3
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
      const params: ExtractStructureParams = {
        selector: String(args.selector || ''),
        include_children: args.include_children === true,
        include_attributes: args.include_attributes !== false,
        include_data_attributes: args.include_data_attributes !== false,
        max_depth: Math.min(Math.max(Number(args.max_depth) || 3, 1), 10)
      };

      // Validate selector
      SecurityValidator.validateSelector(params.selector);

      // Execute extraction script in page context
      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, options: StructureExtractionOptions) => {
          // Helper function to get bounding box
          function getBoundingBox(element: Element): any {
            const rect = element.getBoundingClientRect();
            return {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left
            };
          }

          // Helper function to extract element structure recursively
          function extractStructure(element: Element, currentDepth: number, maxDepth: number): any {
            const structure: any = {
              tag_name: element.tagName.toLowerCase()
            };

            // Add ID if present
            if (element.id) {
              structure.id = element.id;
            }

            // Add classes
            structure.classes = Array.from(element.classList);

            // Add attributes
            if (options.include_attributes) {
              const attributes: Record<string, string> = {};
              const dataAttributes: Record<string, string> = {};
              
              for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                
                // Skip id and class as they're already included
                if (attr.name === 'id' || attr.name === 'class') continue;
                
                // Separate data attributes if requested
                if (options.include_data_attributes && attr.name.startsWith('data-')) {
                  dataAttributes[attr.name] = attr.value;
                } else {
                  attributes[attr.name] = attr.value;
                }
              }
              
              structure.attributes = attributes;
              
              if (options.include_data_attributes && Object.keys(dataAttributes).length > 0) {
                structure.data_attributes = dataAttributes;
              }
            }

            // Add position/bounding box
            structure.position = getBoundingBox(element);

            // Add children if requested and within depth limit
            if (options.include_children && currentDepth < maxDepth) {
              const children: any[] = [];
              
              for (let i = 0; i < element.children.length; i++) {
                const child = element.children[i];
                children.push(extractStructure(child, currentDepth + 1, maxDepth));
              }
              
              if (children.length > 0) {
                structure.children = children;
              }
            }

            return structure;
          }

          // Main extraction logic
          const element = document.querySelector(selector);
          if (!element) {
            return { error: 'Element not found', selector };
          }

          return extractStructure(element, 0, options.max_depth || 3);
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
        executionTime,
        {
          include_children: params.include_children,
          max_depth: params.max_depth
        }
      );

      const response = ResponseFormatter.success<ElementStructure>(result as ElementStructure, metadata);

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
