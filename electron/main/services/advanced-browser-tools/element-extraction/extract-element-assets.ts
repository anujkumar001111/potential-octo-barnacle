/**
 * Extract Element Assets Tool
 * Extracts images, fonts, and background assets from an element
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  SecurityValidator,
  ResponseFormatter,
  AdvancedToolError,
  AdvancedToolErrorCode,
  handleToolError,
  type ElementAssets,
  type AssetExtractionOptions
} from '../shared';

interface ExtractAssetsParams extends AssetExtractionOptions {
  selector: string;
}

export const extractElementAssetsTool: Tool = {
  name: 'extract_element_assets',
  description: 'Extract all assets (images, fonts, backgrounds) from an element. Returns image sources, background images, and font information.',
  parameters: {
    type: 'object',
    properties: {
      selector: { type: 'string', description: 'CSS selector for the element' },
      include_images: { type: 'boolean', default: true },
      include_backgrounds: { type: 'boolean', default: true },
      include_fonts: { type: 'boolean', default: true },
      fetch_external: { type: 'boolean', default: false }
    },
    required: ['selector']
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();
    
    try {
      const params: ExtractAssetsParams = {
        selector: String(args.selector || ''),
        include_images: args.include_images !== false,
        include_backgrounds: args.include_backgrounds !== false,
        include_fonts: args.include_fonts !== false,
        fetch_external: args.fetch_external === true
      };

      SecurityValidator.validateSelector(params.selector);

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (selector: string, options: AssetExtractionOptions) => {
          const element = document.querySelector(selector);
          if (!element) return { error: 'Element not found', selector };

          const result: any = { images: [], background_images: [], fonts: [] };

          // Extract images
          if (options.include_images) {
            const imgs = element.querySelectorAll('img');
            imgs.forEach(img => {
              result.images.push({
                src: img.src,
                alt: img.alt || undefined,
                width: img.width || undefined,
                height: img.height || undefined,
                is_data_url: img.src.startsWith('data:')
              });
            });
          }

          // Extract background images
          if (options.include_backgrounds) {
            const computed = window.getComputedStyle(element);
            const bgImage = computed.getPropertyValue('background-image');
            
            if (bgImage && bgImage !== 'none') {
              // Extract URLs from background-image (can have multiple)
              const urlMatches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
              if (urlMatches) {
                urlMatches.forEach(match => {
                  const url = match.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];
                  if (url) result.background_images.push(url);
                });
              }
            }

            // Check child elements for background images
            const children = element.querySelectorAll('*');
            children.forEach(child => {
              const childComputed = window.getComputedStyle(child);
              const childBg = childComputed.getPropertyValue('background-image');
              if (childBg && childBg !== 'none') {
                const urlMatches = childBg.match(/url\(['"]?([^'"]+)['"]?\)/g);
                if (urlMatches) {
                  urlMatches.forEach(match => {
                    const url = match.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];
                    if (url && !result.background_images.includes(url)) {
                      result.background_images.push(url);
                    }
                  });
                }
              }
            });
          }

          // Extract fonts
          if (options.include_fonts) {
            const computed = window.getComputedStyle(element);
            const fontFamily = computed.getPropertyValue('font-family');
            const fontWeight = computed.getPropertyValue('font-weight');
            const fontStyle = computed.getPropertyValue('font-style');
            
            if (fontFamily) {
              // Parse font families (can be comma-separated)
              const families = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
              
              families.forEach(family => {
                result.fonts.push({
                  family,
                  weight: fontWeight,
                  style: fontStyle,
                  url: undefined // Font URLs would require @font-face rule parsing
                });
              });
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
      const metadata = ResponseFormatter.createMetadata(params.selector, url as string, executionTime);
      const response = ResponseFormatter.success<ElementAssets>(result as ElementAssets, metadata);

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
