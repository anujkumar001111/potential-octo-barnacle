/**
 * Browser Set Zoom Tool
 *
 * Controls the browser zoom level programmatically.
 * Useful for adjusting view scale for better visibility or screenshots.
 *
 * @phase 5
 * @priority HIGH
 * @complexity LOW
 * @risk LOW
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';

interface BrowserSetZoomArgs {
  zoom?: number;
  zoomFactor?: number;
  action?: 'in' | 'out' | 'reset';
  step?: number;
}

export const browserSetZoomTool: Tool = {
  name: 'browser_set_zoom',
  description: 'Set browser zoom level. Use zoom (0.25-5.0), zoomFactor (25%-500%), or action (in/out/reset). Step controls zoom increment (default: 0.1).',
  parameters: {
    type: 'object',
    properties: {
      zoom: {
        type: 'number',
        description: 'Zoom level as decimal (0.25 = 25%, 1.0 = 100%, 2.0 = 200%)'
      },
      zoomFactor: {
        type: 'number',
        description: 'Zoom level as percentage (25-500)'
      },
      action: {
        type: 'string',
        enum: ['in', 'out', 'reset'],
        description: 'Zoom action: "in" to zoom in, "out" to zoom out, "reset" to 100%'
      },
      step: {
        type: 'number',
        description: 'Zoom step increment for in/out actions (default: 0.1 = 10%)'
      }
    },
    required: []
  },
  execute: async (
    args: BrowserSetZoomArgs,
    agentContext: AgentContext
  ): Promise<ToolResult> => {
    try {
      const view = (agentContext.agent as any).view;
      if (!view || !view.webContents) {
        return {
          content: [{
            type: 'text',
            text: 'Error: Browser view not available'
          }],
          isError: true
        };
      }

      let targetZoom = 1.0;
      const currentZoom = view.webContents.getZoomFactor();
      const step = args.step || 0.1;

      // Determine target zoom level
      if (args.zoom !== undefined) {
        targetZoom = Math.max(0.25, Math.min(5.0, args.zoom));
      } else if (args.zoomFactor !== undefined) {
        targetZoom = Math.max(0.25, Math.min(5.0, args.zoomFactor / 100));
      } else if (args.action) {
        switch (args.action) {
          case 'in':
            targetZoom = Math.min(5.0, currentZoom + step);
            break;
          case 'out':
            targetZoom = Math.max(0.25, currentZoom - step);
            break;
          case 'reset':
            targetZoom = 1.0;
            break;
        }
      } else {
        return {
          content: [{
            type: 'text',
            text: 'Error: Must specify zoom, zoomFactor, or action parameter'
          }],
          isError: true
        };
      }

      // Apply zoom
      view.webContents.setZoomFactor(targetZoom);

      const zoomPercent = Math.round(targetZoom * 100);
      const previousPercent = Math.round(currentZoom * 100);

      return {
        content: [{
          type: 'text',
          text: `Zoom set to ${zoomPercent}% (was ${previousPercent}%)`
        }],
        isError: false
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error setting zoom: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
