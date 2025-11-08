/**
 * Extract Complete Element To File Tool
 * Extracts complete element and saves to file
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  SecurityValidator,
  ResponseFormatter,
  FileUtils,
  AdvancedToolError,
  AdvancedToolErrorCode,
  handleToolError,
  type FileOperationResult
} from '../shared';

export const extractCompleteElementToFileTool: Tool = {
  name: 'extract_complete_element_to_file',
  description: 'Extract complete element and save to file. Returns file path and metadata.',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector for the element' },
      include_children: { type: 'boolean', default: true },
      output_dir: { type: 'string', description: 'Output directory (optional)' }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const selector = String(args.selector || '');
      const includeChildren = args.include_children !== false;
      const outputDir = args.output_dir as string | undefined;

      SecurityValidator.validateSelector(selector);

      // Extract element data
      const elementData = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, includeChildren: boolean) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          return {
            selector,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            tag_name: element.tagName.toLowerCase(),
            classes: Array.from(element.classList),
            id: element.id || undefined,
            include_children: includeChildren
          };
        },
        [selector, includeChildren]
      );

      if (elementData && typeof elementData === 'object' && 'error' in elementData) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          elementData.error as string,
          { selector }
        );
      }

      // Save to file
      const filename = FileUtils.generateFilename('extract', selector);
      const fileResult = await FileUtils.saveToJsonFile(elementData, filename, outputDir);

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(selector, url as string, executionTime);
      const response = ResponseFormatter.success<FileOperationResult>(fileResult, metadata);

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
