/**
 * Browser Drag and Drop Tool
 *
 * Performs drag-and-drop operations by simulating mouse events.
 * Useful for canvas manipulation, TradingView charts, file uploads, etc.
 *
 * @phase 5
 * @priority HIGH
 * @complexity MEDIUM
 * @risk LOW
 */

import type { Tool, ToolResult } from '@jarvis-agent/core/types';
import type { AgentContext } from '@jarvis-agent/core';

interface BrowserDragAndDropArgs {
  fromSelector?: string;
  fromX?: number;
  fromY?: number;
  toSelector?: string;
  toX?: number;
  toY?: number;
  duration?: number;
  offsetX?: number;
  offsetY?: number;
}

export const browserDragAndDropTool: Tool = {
  name: 'browser_drag_and_drop',
  description: 'Drag and drop from one location to another. Can drag from/to elements (selector) or coordinates (x, y). Supports canvas dragging, chart manipulation, and file drag operations.',
  parameters: {
    type: 'object',
    properties: {
      fromSelector: {
        type: 'string',
        description: 'CSS selector for the source element to drag from'
      },
      fromX: {
        type: 'number',
        description: 'X coordinate to drag from (if not using fromSelector)'
      },
      fromY: {
        type: 'number',
        description: 'Y coordinate to drag from (if not using fromSelector)'
      },
      toSelector: {
        type: 'string',
        description: 'CSS selector for the target element to drop on'
      },
      toX: {
        type: 'number',
        description: 'X coordinate to drop at (if not using toSelector)'
      },
      toY: {
        type: 'number',
        description: 'Y coordinate to drop at (if not using toSelector)'
      },
      duration: {
        type: 'number',
        description: 'Duration of the drag animation in milliseconds (default: 200)'
      },
      offsetX: {
        type: 'number',
        description: 'X offset from element center (default: 0)'
      },
      offsetY: {
        type: 'number',
        description: 'Y offset from element center (default: 0)'
      }
    },
    required: []
  },
  execute: async (
    args: BrowserDragAndDropArgs,
    agentContext: AgentContext
  ): Promise<ToolResult> => {
    try {
      const duration = args.duration || 200;
      const offsetX = args.offsetX || 0;
      const offsetY = args.offsetY || 0;

      const result = await (agentContext.agent as any).execute_script(
        agentContext,
        agentContext,
        (
          fromSelector: string | undefined,
          fromX: number | undefined,
          fromY: number | undefined,
          toSelector: string | undefined,
          toX: number | undefined,
          toY: number | undefined,
          duration: number,
          offsetX: number,
          offsetY: number
        ) => {
          // Helper to get coordinates
          const getCoordinates = (
            selector: string | undefined,
            x: number | undefined,
            y: number | undefined,
            offsetX: number,
            offsetY: number
          ): { x: number; y: number } | null => {
            if (selector) {
              const element = document.querySelector(selector) as HTMLElement;
              if (!element) return null;

              const rect = element.getBoundingClientRect();
              return {
                x: rect.left + rect.width / 2 + offsetX,
                y: rect.top + rect.height / 2 + offsetY
              };
            }

            if (x !== undefined && y !== undefined) {
              return { x, y };
            }

            return null;
          };

          const startCoords = getCoordinates(fromSelector, fromX, fromY, offsetX, offsetY);
          const endCoords = getCoordinates(toSelector, toX, toY, offsetX, offsetY);

          if (!startCoords || !endCoords) {
            return {
              success: false,
              message: 'Could not determine start or end coordinates'
            };
          }

          // Get element at start position
          const startElement = document.elementFromPoint(startCoords.x, startCoords.y);
          if (!startElement) {
            return {
              success: false,
              message: 'No element found at start position'
            };
          }

          // Create drag events
          const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: startCoords.x,
            clientY: startCoords.y,
            button: 0
          });

          const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: startCoords.x,
            clientY: startCoords.y
          });

          // Dispatch start events
          startElement.dispatchEvent(mouseDownEvent);
          startElement.dispatchEvent(dragStartEvent);

          // Simulate drag motion with intermediate points
          const steps = Math.max(10, Math.floor(duration / 16)); // ~60fps
          const deltaX = (endCoords.x - startCoords.x) / steps;
          const deltaY = (endCoords.y - startCoords.y) / steps;

          let currentX = startCoords.x;
          let currentY = startCoords.y;

          // Perform drag motion
          for (let i = 0; i <= steps; i++) {
            currentX = startCoords.x + deltaX * i;
            currentY = startCoords.y + deltaY * i;

            const mouseMoveEvent = new MouseEvent('mousemove', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: currentX,
              clientY: currentY,
              button: 0
            });

            const dragEvent = new DragEvent('drag', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: currentX,
              clientY: currentY
            });

            document.dispatchEvent(mouseMoveEvent);
            startElement.dispatchEvent(dragEvent);
          }

          // Get element at end position
          const endElement = document.elementFromPoint(endCoords.x, endCoords.y);

          // Create drop events
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: endCoords.x,
            clientY: endCoords.y
          });

          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: endCoords.x,
            clientY: endCoords.y
          });

          const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: endCoords.x,
            clientY: endCoords.y,
            button: 0
          });

          const dragEndEvent = new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: endCoords.x,
            clientY: endCoords.y
          });

          // Dispatch end events
          if (endElement) {
            endElement.dispatchEvent(dragOverEvent);
            endElement.dispatchEvent(dropEvent);
          }
          startElement.dispatchEvent(mouseUpEvent);
          startElement.dispatchEvent(dragEndEvent);

          return {
            success: true,
            startX: startCoords.x,
            startY: startCoords.y,
            endX: endCoords.x,
            endY: endCoords.y,
            distance: Math.sqrt(
              Math.pow(endCoords.x - startCoords.x, 2) +
              Math.pow(endCoords.y - startCoords.y, 2)
            ),
            message: `Dragged from (${Math.round(startCoords.x)}, ${Math.round(startCoords.y)}) to (${Math.round(endCoords.x)}, ${Math.round(endCoords.y)})`
          };
        },
        [
          args.fromSelector,
          args.fromX,
          args.fromY,
          args.toSelector,
          args.toX,
          args.toY,
          duration,
          offsetX,
          offsetY
        ]
      );

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: result.message
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `${result.message} (distance: ${Math.round(result.distance)}px)`
        }],
        isError: false
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error performing drag and drop: ${error.message}`
        }],
        isError: true
      };
    }
  }
};
