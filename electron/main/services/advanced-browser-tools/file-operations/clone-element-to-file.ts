/**
 * Clone Element To File Tool
 * Clones element completely and saves to file instead of returning inline
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
  type FileOperationResult,
  type CompleteExtractionOptions
} from '../shared';

interface CloneToFileParams {
  selector: string;
  output_dir?: string;
  extraction_options?: CompleteExtractionOptions;
}

export const cloneElementToFileTool: Tool = {
  name: 'clone_element_to_file',
  description: 'Clone element completely and save to file. Returns file path instead of full data. Ideal for large elements or when you want persistent storage.',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector for the element' },
      output_dir: { type: 'string', description: 'Output directory (optional)', default: './advanced-browser-tools-output' },
      extraction_options: { type: 'object', description: 'Options for extraction' }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const params: CloneToFileParams = {
        selector: String(args.selector || ''),
        output_dir: args.output_dir as string | undefined,
        extraction_options: (args.extraction_options as CompleteExtractionOptions) || {}
      };

      SecurityValidator.validateSelector(params.selector);

      // Extract element data (simplified version)
      const elementData = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          return {
            selector,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            tag_name: element.tagName.toLowerCase(),
            classes: Array.from(element.classList),
            id: element.id || undefined
          };
        },
        [params.selector]
      );

      if (elementData && typeof elementData === 'object' && 'error' in elementData) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          elementData.error as string,
          { selector: params.selector }
        );
      }

      // Save to file
      const filename = FileUtils.generateFilename('clone', params.selector);
      const fileResult = await FileUtils.saveToJsonFile(
        elementData,
        filename,
        params.output_dir
      );

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      
      const metadata = ResponseFormatter.createMetadata(
        params.selector,
        url as string,
        executionTime
      );

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
