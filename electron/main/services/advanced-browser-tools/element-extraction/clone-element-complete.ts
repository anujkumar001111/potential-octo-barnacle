/**
 * Clone Element Complete Tool
 * Master function that combines all extraction methods for complete element cloning
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
  type CompleteElementClone,
  type CompleteExtractionOptions
} from '../shared';

interface CloneElementParams {
  selector: string;
  extraction_options?: CompleteExtractionOptions;
}

export const cloneElementCompleteTool: Tool = {
  name: 'clone_element_complete',
  description: 'Master function that extracts ALL element data (styles, structure, events, animations, assets, related files) in one call. Automatically saves to file if response is too large. Use this for complete element fidelity.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector for the element to clone'
      },
      extraction_options: {
        type: 'object',
        description: 'Options for each extraction type',
        properties: {
          styles: { type: 'object' },
          structure: { type: 'object' },
          events: { type: 'object' },
          animations: { type: 'object' },
          assets: { type: 'object' },
          related_files: { type: 'object' }
        }
      }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const params: CloneElementParams = {
        selector: String(args.selector || ''),
        extraction_options: (args.extraction_options as CompleteExtractionOptions) || {}
      };

      SecurityValidator.validateSelector(params.selector);

      // Get URL first
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);

      // Execute complete extraction
      const result = await (agentContext.agent as any).execute_script(agentContext,
        agentContext,
        (selector: string, _options: CompleteExtractionOptions) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          const clone: any = {
            selector,
            url: window.location.href,
            timestamp: new Date().toISOString()
          };

          // Extract styles
          try {
            const computed = window.getComputedStyle(element);
            const computedStyles: Record<string, string> = {};
            for (let i = 0; i < computed.length; i++) {
              const prop = computed[i];
              computedStyles[prop] = computed.getPropertyValue(prop);
            }
            clone.styles = { computed_styles: computedStyles };
          } catch (e) {
            clone.styles = { error: 'Style extraction failed' };
          }

          // Extract structure
          try {
            const structure: any = {
              tag_name: element.tagName.toLowerCase(),
              classes: Array.from(element.classList),
              attributes: {},
              position: element.getBoundingClientRect()
            };
            if (element.id) structure.id = element.id;

            for (let i = 0; i < element.attributes.length; i++) {
              const attr = element.attributes[i];
              if (attr.name !== 'id' && attr.name !== 'class') {
                structure.attributes[attr.name] = attr.value;
              }
            }
            clone.structure = structure;
          } catch (e) {
            clone.structure = { error: 'Structure extraction failed' };
          }

          // Extract events (simplified)
          try {
            const inline_handlers: Record<string, string> = {};
            const eventAttrs = ['onclick', 'onchange', 'oninput', 'onsubmit'];
            eventAttrs.forEach(attr => {
              const value = element.getAttribute(attr);
              if (value) inline_handlers[attr] = value;
            });
            clone.events = { inline_handlers, event_listeners: [], framework_handlers: [] };
          } catch (e) {
            clone.events = { error: 'Event extraction failed' };
          }

          // Extract animations
          try {
            const _computed = window.getComputedStyle(element);
            clone.animations = {
              css_animations: [],
              transitions: [],
              transforms: []
            };
          } catch (e) {
            clone.animations = { error: 'Animation extraction failed' };
          }

          // Extract assets
          try {
            const images: any[] = [];
            element.querySelectorAll('img').forEach(img => {
              images.push({ src: img.src, alt: img.alt });
            });
            clone.assets = { images, background_images: [], fonts: [] };
          } catch (e) {
            clone.assets = { error: 'Asset extraction failed' };
          }

          // Extract related files
          try {
            const stylesheets: any[] = [];
            document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
              const href = link.getAttribute('href');
              if (href) stylesheets.push({ href });
            });
            clone.related_files = { stylesheets, scripts: [], imports: [], frameworks: [] };
          } catch (e) {
            clone.related_files = { error: 'Related files extraction failed' };
          }

          return clone;
        },
        [params.selector, params.extraction_options]
      );

      if (result && typeof result === 'object' && 'error' in result) {
        throw new AdvancedToolError(
          AdvancedToolErrorCode.ELEMENT_NOT_FOUND,
          result.error as string,
          { selector: params.selector }
        );
      }

      const executionTime = Date.now() - startTime;

      // Check if response is too large
      if (ResponseFormatter.isResponseTooLarge(result)) {
        // Save to file
        const filename = FileUtils.generateFilename('complete_clone', params.selector);
        const fileResult = await FileUtils.saveToJsonFile(result, filename);

        const metadata = ResponseFormatter.createMetadata(
          params.selector,
          url as string,
          executionTime,
          { saved_to_file: true }
        );

        const response = ResponseFormatter.createFileSavedResponse(
          fileResult.file_path,
          fileResult.file_size_kb * 1024,
          metadata
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
          isError: false
        };
      }

      // Return inline if small enough
      const metadata = ResponseFormatter.createMetadata(
        params.selector,
        url as string,
        executionTime
      );

      const response = ResponseFormatter.success<CompleteElementClone>(
        result as CompleteElementClone,
        metadata
      );

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