/**
 * Extract Related Files Tool
 * Discovers CSS and JavaScript files related to the current page
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';
import {
  ResponseFormatter,
  handleToolError,
  type RelatedFiles,
  type RelatedFilesOptions
} from '../shared';

interface ExtractRelatedFilesParams extends RelatedFilesOptions {}

export const extractRelatedFilesTool: Tool = {
  name: 'extract_related_files',
  description: 'Discover all CSS and JavaScript files related to the current page. Returns stylesheets, scripts, imports, and detected frameworks.',
  parameters: {
    type: 'object',
    properties: {
      analyze_css: { type: 'boolean', default: true },
      analyze_js: { type: 'boolean', default: true },
      follow_imports: { type: 'boolean', default: false },
      max_depth: { type: 'number', default: 2 }
    }
  },
  execute: async (args: Record<string, unknown>, agentContext: AgentContext): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const params: ExtractRelatedFilesParams = {
        analyze_css: args.analyze_css !== false,
        analyze_js: args.analyze_js !== false,
        follow_imports: args.follow_imports === true,
        max_depth: Math.min(Math.max(Number(args.max_depth) || 2, 1), 5)
      };

      const result = await (agentContext.agent as any).execute_script(agentContext, 
        agentContext,
        (options: RelatedFilesOptions) => {
          const result: any = { stylesheets: [], scripts: [], imports: [], frameworks: [] };

          // Extract stylesheets
          if (options.analyze_css) {
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            links.forEach(link => {
              const href = link.getAttribute('href');
              if (href) {
                result.stylesheets.push({
                  href,
                  media: link.getAttribute('media') || undefined,
                  disabled: (link as HTMLLinkElement).disabled
                });
              }
            });

            // Extract inline styles
            const styles = document.querySelectorAll('style');
            if (styles.length > 0) {
              result.stylesheets.push({
                href: 'inline',
                media: undefined,
                disabled: false
              });
            }
          }

          // Extract scripts
          if (options.analyze_js) {
            const scripts = document.querySelectorAll('script');
            scripts.forEach(script => {
              const src = script.getAttribute('src');
              if (src) {
                result.scripts.push({
                  src,
                  type: script.getAttribute('type') || undefined,
                  async: script.hasAttribute('async'),
                  defer: script.hasAttribute('defer'),
                  is_module: script.getAttribute('type') === 'module'
                });
              }
            });
          }

          // Detect frameworks
          const frameworks: string[] = [];

          // React
          if ((window as any).React || document.querySelector('[data-reactroot], [data-reactid]')) {
            frameworks.push('React');
          }

          // Vue
          if ((window as any).Vue || document.querySelector('[data-v-]')) {
            frameworks.push('Vue');
          }

          // Angular
          if ((window as any).ng || document.querySelector('[ng-version]')) {
            frameworks.push('Angular');
          }

          // Svelte
          if (document.querySelector('[class*="svelte-"]')) {
            frameworks.push('Svelte');
          }

          // jQuery
          if ((window as any).jQuery || (window as any).$) {
            frameworks.push('jQuery');
          }

          result.frameworks = frameworks;

          return result;
        },
        [params]
      );

      const executionTime = Date.now() - startTime;
      const url = await (agentContext.agent as any).execute_script(agentContext, () => window.location.href, []);
      const metadata = ResponseFormatter.createMetadata(undefined, url as string, executionTime);
      const response = ResponseFormatter.success<RelatedFiles>(result as RelatedFiles, metadata);

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